export interface WeeklyListing {
  id: string;
  title: string;
  price: number;
  price_text: string;
  market_price: number;
  market_price_text: string;
  price_difference: number;
  price_difference_percentage: string;
  location: string;
  year: number;
  kilometers: number;
  fuel_type: string;
  transmission: string;
  url: string;
  horsepower: number;
  distance: number;
  listing_images: Array<{ image_url: string }>;
}

export const weeklyListings: WeeklyListing[] = [
  {
    id: "0j242op7mezy",
    title: "Audi A3 2021",
    price: 12200,
    price_text: "12.200 €",
    market_price: 22900,
    market_price_text: "22.900 €",
    price_difference: 10700,
    price_difference_percentage: "46.7%",
    location: "Barcelona, 08026",
    year: 2021,
    kilometers: 36279,
    fuel_type: "Gasoline",
    transmission: "Manual",
    url: "https://es.wallapop.com/item/audi-a3-2021-1087530611",
    horsepower: 150,
    distance: 36,
    listing_images: [
      {
        image_url: "https://cdn.wallapop.com/images/10420/hz/hj/__/c10420p1087530611/i5344812538.jpg?pictureSize=W800"
      }
    ]
  },
  {
    id: "ejk8qw5v01jx",
    title: "BMW Serie 3 etiqueta ambiental Verde C",
    price: 11600,
    price_text: "11.600 €",
    market_price: 14800,
    market_price_text: "14.800 €",
    price_difference: 3200,
    price_difference_percentage: "21.6%",
    location: "Viladecans, 08840",
    year: 2019,
    kilometers: 198500,
    fuel_type: "Gasoil",
    transmission: "Manual",
    url: "https://es.wallapop.com/item/bmw-serie-3-2019-1079072423",
    horsepower: 150,
    distance: 495,
    listing_images: [
      {
        image_url: "https://cdn.wallapop.com/images/10420/hu/g9/__/c10420p1079072423/i5299664240.jpg?pictureSize=W800"
      }
    ]
  },
  {
    id: "c515afd4-4846-4886-84ba-57bd86733fc7",
    title: "SEAT Leon 2012",
    price: 5500,
    price_text: "5.500 €",
    market_price: 8950,
    market_price_text: "8.950 €",
    price_difference: 3450,
    price_difference_percentage: "38.5%",
    location: "Terrassa, 08223",
    year: 2012,
    kilometers: 183000,
    fuel_type: "Gasoline",
    transmission: "Manual",
    url: "https://es.wallapop.com/item/seat-leon-2012-1-4-tsi-motor-aberoado-1041914982",
    horsepower: 122,
    distance: 23,
    listing_images: [
      {
        image_url: "https://cdn.wallapop.com/images/10420/h8/bu/__/c10420p1041914982/i5087674188.jpg?pictureSize=W800"
      }
    ]
  }
]; 