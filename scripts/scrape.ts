import "dotenv/config";
import { trackProduct } from "../lib/scraper";

// -----------------------------
// Example usage
// -----------------------------
const COMPETITOR = "Nike";
const PRODUCT_NAME = "Air Jordan 1";
const PRODUCT_URL = "https://www.nike.com/air-jordan-1";

trackProduct(COMPETITOR, PRODUCT_NAME, PRODUCT_URL)
  .then((result) => console.log(JSON.stringify(result, null, 2)))
  .catch((err) => console.error(err));
