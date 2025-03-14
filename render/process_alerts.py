from datetime import datetime, timezone, timedelta
import logging
from typing import Dict, List, Any
import wallapop_endpoint_search
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

logger = logging.getLogger(__name__)

def format_price_text(price: float) -> str:
    """Format price as text with euro symbol"""
    return f"{price:,.0f} €".replace(",", ".")

def send_email_notification(to_email: str, new_listings: List[Dict], alert_info: Dict):
    """Send email notification about new listings"""
    try:
        # Get SMTP configuration from environment variables
        smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        smtp_port = int(os.getenv("SMTP_PORT", "587"))
        smtp_username = os.getenv("SMTP_USERNAME")
        smtp_password = os.getenv("SMTP_PASSWORD")

        # Validate SMTP configuration
        if not smtp_username or not smtp_password:
            logger.error("SMTP credentials not configured. Please set SMTP_USERNAME and SMTP_PASSWORD environment variables.")
            return False

        # Create message
        msg = MIMEMultipart()
        msg['From'] = f"Alertas de Coches <{smtp_username}>"
        msg['To'] = to_email
        msg['Subject'] = f"¡Nuevos anuncios encontrados para tu alerta de {alert_info['brand']} {alert_info['model']}!"

        # Create email body with inline styles for better email client compatibility
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 25px; text-align: center;">
                <a href="https://cholloscars.com/app/alertas/{alert_info['id']}" style="color: #3498db; text-decoration: none; font-size: 16px; font-weight: bold;">
                    👉 Visita tu panel de alertas para gestionar tus búsquedas y ver todos los anuncios 👈
                </a>
            </div>
            
            <h2 style="color: #2c3e50; margin-bottom: 20px;">¡Nuevos anuncios encontrados para tu {alert_info['brand']} {alert_info['model']}!</h2>
            <p style="font-size: 16px;">Hemos encontrado {len(new_listings)} nuevos anuncios que coinciden con tus criterios:</p>
            <div>
        """
        
        # Add each new listing to the email
        for listing in new_listings:
            price_text = listing['price_text']
            title = listing['title']
            url = listing['url']
            location = listing['location']
            year = listing['year']
            km = f"{listing['kilometers']:,}".replace(",", ".")
            
            # Get the first image URL if available
            image_url = listing['listing_images'][0]['image_url'] if listing['listing_images'] else None
            
            body += f"""
            <div style="border: 1px solid #ddd; padding: 15px; margin-bottom: 20px; border-radius: 5px; display: flex; align-items: start;">
                <div style="flex: 1; min-width: 0; margin-right: auto; padding-right: 15px;">
                    <h3 style="color: #2c3e50; margin: 0 0 10px 0; overflow: hidden; text-overflow: ellipsis;">{title}</h3>
                    <p style="font-size: 18px; color: #27ae60; margin: 10px 0;"><strong>{price_text}</strong></p>
                    <p style="margin: 5px 0;">
                        <span style="color: #7f8c8d;">Año:</span> {year} | 
                        <span style="color: #7f8c8d;">Kilómetros:</span> {km}
                    </p>
                    <p style="margin: 5px 0;"><span style="color: #7f8c8d;">Ubicación:</span> {location}</p>
                </div>
                {f'<div style="width: 150px; flex-shrink: 0;"><img src="{image_url}" alt="{title}" style="width: 150px; height: 150px; object-fit: cover; border-radius: 5px;"></div>' if image_url else ''}
            </div>
            """
        
        body += """
            </div>
        </div>
        </body>
        </html>
        """

        msg.attach(MIMEText(body, 'html'))

        try:
            # Connect to SMTP server with timeout
            with smtplib.SMTP(smtp_server, smtp_port, timeout=30) as server:
                server.starttls()
                server.login(smtp_username, smtp_password)
                server.send_message(msg)
                
            logger.info(f"Email notification sent successfully to {to_email}")
            return True
            
        except smtplib.SMTPException as smtp_error:
            logger.error(f"SMTP error sending email to {to_email}: {str(smtp_error)}")
            return False
        except TimeoutError:
            logger.error(f"Timeout error while sending email to {to_email}")
            return False
        
    except Exception as e:
        logger.error(f"Unexpected error sending email notification: {str(e)}")
        return False

def process_alerts(supabase):
    """Process all alerts and run searches for those that haven't been run in 23 hours"""
    try:
        # Get all alerts with their associated user emails
        alerts_response = supabase.table('alertas')\
            .select('*, users!inner(email)')\
            .execute()
        alerts = alerts_response.data
        
        if not alerts:
            return {"message": "No alerts found", "alerts_processed": 0}
        
        processed_alerts = []
        
        for alert in alerts:
            try:
                # Get user email from the joined data
                user_email = alert['users']['email']
                
                # Get the latest run for this alert
                latest_run = supabase.table('alert_runs')\
                    .select('*, market_data(*)')\
                    .eq('alert_id', alert['id'])\
                    .order('created_at', desc=True)\
                    .limit(1)\
                    .execute()
                
                should_run = True
                previous_listing_ids = set()
                if latest_run.data:
                    last_run_time = datetime.fromisoformat(latest_run.data[0]['created_at'].replace('Z', '+00:00'))
                    time_since_last_run = datetime.now(timezone.utc) - last_run_time
                    should_run = time_since_last_run > timedelta(hours=23)
                    # Get previous listing IDs from the market data
                    if latest_run.data[0].get('market_data'):
                        try:
                            previous_listing_ids = {listing['id'] for listing in latest_run.data[0]['market_data'].get('listings', [])}
                        except (KeyError, TypeError):
                            logger.warning(f"Could not get previous listings for alert {alert['id']}")
                            previous_listing_ids = set()
                
                if should_run:
                    logger.info(f"Processing alert {alert['id']} for user {user_email}")
                    
                    # Prepare search parameters
                    search_params = {
                        'brand': alert['brand'],
                        'model': alert['model'],
                        'min_year': alert['min_year'],
                        'max_year': alert['max_year'],
                        'engine': alert['engine'].lower() if alert['engine'] else None,
                        'min_horse_power': alert['min_horse_power'],
                        'gearbox': alert['gearbox'].lower() if alert['gearbox'] else None,
                        'latitude': alert['latitude'],
                        'longitude': alert['longitude'],
                        'distance': alert['distance'],
                        'max_kilometers': alert['max_kilometers']
                    }
                    
                    # Remove None values
                    search_params = {k: v for k, v in search_params.items() if v is not None}
                    
                    # Perform search using the new endpoint search function
                    logger.info(f"Running search for alert {alert['id']}")
                    result = wallapop_endpoint_search.search_wallapop_endpoint(search_params)
                    
                    if result and not result.get('error'):
                        # Transform listings to match frontend format
                        transformed_listings = []
                        new_listings = []  # Track new listings for notifications
                        
                        for listing in result.get('listings', []):
                            try:
                                listing_id = listing.get('listing_id')  # Use get() to safely access fields
                                if not listing_id:
                                    continue
                                    
                                # Check if this is a new listing
                                is_new_listing = listing_id not in previous_listing_ids
                                
                                if is_new_listing:
                                    new_listings.append(listing)
                                transformed_listings.append(listing)
                                
                            except Exception as e:
                                logger.error(f"Error processing listing in alert {alert['id']}: {str(e)}")
                                continue
                        
                        # First create the market data entry
                        market_data = result.get('market_data', {})
                        market_data_entry = {
                            'average_price': market_data.get('average_price', 0),
                            'median_price': market_data.get('median_price', 0),
                            'min_price': market_data.get('min_price', 0),
                            'max_price': market_data.get('max_price', 0),
                            'total_listings': market_data.get('total_listings', 0),
                            'valid_listings': market_data.get('valid_listings', 0),
                            'created_at': datetime.now(timezone.utc).isoformat()
                        }
                        
                        # Insert market data and get its ID
                        market_data_response = supabase.table('market_data').insert(market_data_entry).execute()
                        market_data_id = market_data_response.data[0]['id']
                        
                        # Create alert run with reference to market data
                        run_data = {
                            'alert_id': alert['id'],
                            'market_data_id': market_data_id,
                            'created_at': datetime.now(timezone.utc).isoformat()
                        }
                        
                        # Insert alert run
                        supabase.table('alert_runs').insert(run_data).execute()
                        
                        # If there are new listings, send email notification
                        if new_listings and alert.get('email_notifications', True):
                            alert_info = {
                                'brand': alert['brand'],
                                'model': alert['model'],
                                'id': alert['id']
                            }
                            send_email_notification(user_email, new_listings, alert_info)
                        
                        processed_alerts.append({
                            'alert_id': alert['id'],
                            'success': True,
                            'listings_found': len(transformed_listings),
                            'new_listings_found': len(new_listings),
                            'market_data': market_data
                        })
                    else:
                        error_message = result.get('error') if result else 'Search returned no results'
                        processed_alerts.append({
                            'alert_id': alert['id'],
                            'success': False,
                            'error': error_message
                        })
                else:
                    logger.info(f"Skipping alert {alert['id']} - last run was less than 23 hours ago")
                    
            except Exception as e:
                logger.error(f"Error processing alert {alert['id']}: {str(e)}")
                processed_alerts.append({
                    'alert_id': alert['id'],
                    'success': False,
                    'error': str(e)
                })
        
        return {
            "message": "Alerts processing completed",
            "alerts_processed": len(processed_alerts),
            "results": processed_alerts
        }
            
    except Exception as e:
        logger.error(f"Error in process_alerts: {str(e)}")
        return {"error": str(e)} 