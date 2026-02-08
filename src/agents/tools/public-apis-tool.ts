/**
 * Public APIs tool – gives the agent access to a curated database of
 * public APIs from the public-api-lists project.
 *
 * The agent can search for APIs by category, name, or keyword,
 * and get setup information including documentation links and
 * authentication requirements.
 *
 * Based on: https://github.com/public-api-lists/public-api-lists
 */

import { Type } from "@sinclair/typebox";
import { stringEnum } from "../schema/typebox.js";
import { type AnyAgentTool, jsonResult, readStringParam } from "./common.js";

/** A public API entry. */
type PublicApiEntry = {
  name: string;
  description: string;
  category: string;
  auth: string;
  https: boolean;
  cors: string;
  url: string;
};

const PUBLIC_APIS_ACTIONS = ["search", "list_categories", "by_category", "get_setup_info"] as const;

const PublicApisToolSchema = Type.Object({
  action: stringEnum(PUBLIC_APIS_ACTIONS),
  query: Type.Optional(Type.String({ description: "Search query for API name or description." })),
  category: Type.Optional(
    Type.String({ description: "Category to filter by (e.g. 'Weather', 'Finance')." }),
  ),
  api_name: Type.Optional(Type.String({ description: "Exact API name (for get_setup_info)." })),
  limit: Type.Optional(
    Type.Number({ description: "Max results to return.", minimum: 1, maximum: 50 }),
  ),
});

/**
 * Curated database of public APIs.
 * This is a comprehensive subset sourced from public-api-lists/public-api-lists.
 */
const PUBLIC_API_CATALOG: PublicApiEntry[] = [
  // Animals
  {
    name: "Dog API",
    description: "Random dog images",
    category: "Animals",
    auth: "No",
    https: true,
    cors: "Yes",
    url: "https://dog.ceo/dog-api/",
  },
  {
    name: "Cat Facts",
    description: "Random cat facts",
    category: "Animals",
    auth: "No",
    https: true,
    cors: "No",
    url: "https://catfact.ninja/",
  },
  {
    name: "The Dog API",
    description: "Dogs as a service – images, breeds, and more",
    category: "Animals",
    auth: "apiKey",
    https: true,
    cors: "No",
    url: "https://thedogapi.com/",
  },
  {
    name: "The Cat API",
    description: "Cats as a service – images, breeds, and more",
    category: "Animals",
    auth: "apiKey",
    https: true,
    cors: "No",
    url: "https://thecatapi.com/",
  },

  // Weather
  {
    name: "OpenWeatherMap",
    description: "Current weather data, forecasts, and historical data",
    category: "Weather",
    auth: "apiKey",
    https: true,
    cors: "Unknown",
    url: "https://openweathermap.org/api",
  },
  {
    name: "WeatherAPI",
    description: "Weather data including forecast, history, astronomy",
    category: "Weather",
    auth: "apiKey",
    https: true,
    cors: "Yes",
    url: "https://www.weatherapi.com/",
  },
  {
    name: "Open-Meteo",
    description: "Free weather API for non-commercial use",
    category: "Weather",
    auth: "No",
    https: true,
    cors: "Yes",
    url: "https://open-meteo.com/",
  },
  {
    name: "Visual Crossing",
    description: "Weather data with historical archives",
    category: "Weather",
    auth: "apiKey",
    https: true,
    cors: "Yes",
    url: "https://www.visualcrossing.com/weather-api",
  },

  // Finance
  {
    name: "Alpha Vantage",
    description: "Stock, forex, and crypto market data",
    category: "Finance",
    auth: "apiKey",
    https: true,
    cors: "Unknown",
    url: "https://www.alphavantage.co/",
  },
  {
    name: "CoinGecko",
    description: "Cryptocurrency data – prices, market cap, volume",
    category: "Finance",
    auth: "No",
    https: true,
    cors: "Yes",
    url: "https://www.coingecko.com/en/api",
  },
  {
    name: "ExchangeRate-API",
    description: "Currency exchange rates",
    category: "Finance",
    auth: "apiKey",
    https: true,
    cors: "Yes",
    url: "https://www.exchangerate-api.com/",
  },
  {
    name: "Finnhub",
    description: "Real-time stock, forex, and crypto data",
    category: "Finance",
    auth: "apiKey",
    https: true,
    cors: "Unknown",
    url: "https://finnhub.io/",
  },
  {
    name: "IEX Cloud",
    description: "Financial data including stocks, crypto, FX",
    category: "Finance",
    auth: "apiKey",
    https: true,
    cors: "Yes",
    url: "https://iexcloud.io/",
  },
  {
    name: "Stripe",
    description: "Payment processing and billing",
    category: "Finance",
    auth: "apiKey",
    https: true,
    cors: "Unknown",
    url: "https://stripe.com/docs/api",
  },

  // Development
  {
    name: "GitHub",
    description: "Repositories, users, issues, and more",
    category: "Development",
    auth: "OAuth",
    https: true,
    cors: "Yes",
    url: "https://docs.github.com/en/rest",
  },
  {
    name: "GitLab",
    description: "GitLab API for projects, merge requests, CI/CD",
    category: "Development",
    auth: "OAuth",
    https: true,
    cors: "Unknown",
    url: "https://docs.gitlab.com/ee/api/",
  },
  {
    name: "JSONPlaceholder",
    description: "Free fake REST API for testing",
    category: "Development",
    auth: "No",
    https: true,
    cors: "Unknown",
    url: "https://jsonplaceholder.typicode.com/",
  },
  {
    name: "httpbin",
    description: "HTTP request and response testing",
    category: "Development",
    auth: "No",
    https: true,
    cors: "Yes",
    url: "https://httpbin.org/",
  },
  {
    name: "Postman Echo",
    description: "Echo service for API testing",
    category: "Development",
    auth: "No",
    https: true,
    cors: "Unknown",
    url: "https://www.postman.com/postman/workspace/published-postman-templates/documentation/631643-f695cab7-6878-eb55-7943-ad88e1ccfd65",
  },
  {
    name: "Vercel",
    description: "Deploy and manage serverless functions",
    category: "Development",
    auth: "apiKey",
    https: true,
    cors: "Unknown",
    url: "https://vercel.com/docs/rest-api",
  },

  // AI & Machine Learning
  {
    name: "OpenAI",
    description: "GPT, DALL-E, Whisper, and embeddings",
    category: "AI",
    auth: "apiKey",
    https: true,
    cors: "Yes",
    url: "https://platform.openai.com/docs/api-reference",
  },
  {
    name: "Anthropic",
    description: "Claude AI assistant API",
    category: "AI",
    auth: "apiKey",
    https: true,
    cors: "Yes",
    url: "https://docs.anthropic.com/claude/reference",
  },
  {
    name: "Hugging Face",
    description: "ML model inference and hosting",
    category: "AI",
    auth: "apiKey",
    https: true,
    cors: "Yes",
    url: "https://huggingface.co/docs/api-inference",
  },
  {
    name: "Replicate",
    description: "Run ML models in the cloud",
    category: "AI",
    auth: "apiKey",
    https: true,
    cors: "Unknown",
    url: "https://replicate.com/docs/reference/http",
  },
  {
    name: "Stability AI",
    description: "Image generation with Stable Diffusion",
    category: "AI",
    auth: "apiKey",
    https: true,
    cors: "Unknown",
    url: "https://platform.stability.ai/",
  },
  {
    name: "Cohere",
    description: "NLP models for text generation and analysis",
    category: "AI",
    auth: "apiKey",
    https: true,
    cors: "Unknown",
    url: "https://docs.cohere.com/",
  },
  {
    name: "ElevenLabs",
    description: "AI voice generation and text-to-speech",
    category: "AI",
    auth: "apiKey",
    https: true,
    cors: "Unknown",
    url: "https://elevenlabs.io/docs/api-reference",
  },

  // Communication
  {
    name: "Twilio",
    description: "SMS, voice, video, and email APIs",
    category: "Communication",
    auth: "apiKey",
    https: true,
    cors: "Unknown",
    url: "https://www.twilio.com/docs/usage/api",
  },
  {
    name: "SendGrid",
    description: "Email delivery service",
    category: "Communication",
    auth: "apiKey",
    https: true,
    cors: "Unknown",
    url: "https://docs.sendgrid.com/api-reference",
  },
  {
    name: "Slack",
    description: "Messaging and workflow automation",
    category: "Communication",
    auth: "OAuth",
    https: true,
    cors: "Unknown",
    url: "https://api.slack.com/",
  },
  {
    name: "Discord",
    description: "Chat, voice, and community platform",
    category: "Communication",
    auth: "OAuth",
    https: true,
    cors: "Unknown",
    url: "https://discord.com/developers/docs",
  },
  {
    name: "Telegram Bot",
    description: "Build bots for Telegram",
    category: "Communication",
    auth: "apiKey",
    https: true,
    cors: "Unknown",
    url: "https://core.telegram.org/bots/api",
  },
  {
    name: "Mailgun",
    description: "Email sending and receiving",
    category: "Communication",
    auth: "apiKey",
    https: true,
    cors: "Unknown",
    url: "https://documentation.mailgun.com/",
  },

  // Data & Storage
  {
    name: "Firebase",
    description: "Google's app development platform with real-time DB",
    category: "Data",
    auth: "apiKey",
    https: true,
    cors: "Yes",
    url: "https://firebase.google.com/docs/reference/rest",
  },
  {
    name: "Supabase",
    description: "Open source Firebase alternative",
    category: "Data",
    auth: "apiKey",
    https: true,
    cors: "Yes",
    url: "https://supabase.com/docs/guides/api",
  },
  {
    name: "Airtable",
    description: "Spreadsheet-database hybrid",
    category: "Data",
    auth: "apiKey",
    https: true,
    cors: "Unknown",
    url: "https://airtable.com/developers/web/api/introduction",
  },
  {
    name: "Notion",
    description: "All-in-one workspace API",
    category: "Data",
    auth: "OAuth",
    https: true,
    cors: "Unknown",
    url: "https://developers.notion.com/",
  },
  {
    name: "Cloudinary",
    description: "Image and video management",
    category: "Data",
    auth: "apiKey",
    https: true,
    cors: "Unknown",
    url: "https://cloudinary.com/documentation/image_upload_api_reference",
  },

  // Geocoding & Maps
  {
    name: "Google Maps",
    description: "Maps, geocoding, directions, places",
    category: "Geocoding",
    auth: "apiKey",
    https: true,
    cors: "Unknown",
    url: "https://developers.google.com/maps/documentation",
  },
  {
    name: "Mapbox",
    description: "Maps, geocoding, navigation",
    category: "Geocoding",
    auth: "apiKey",
    https: true,
    cors: "Unknown",
    url: "https://docs.mapbox.com/api/",
  },
  {
    name: "OpenStreetMap Nominatim",
    description: "Free geocoding and reverse geocoding",
    category: "Geocoding",
    auth: "No",
    https: true,
    cors: "Yes",
    url: "https://nominatim.org/release-docs/latest/api/Overview/",
  },
  {
    name: "IP-API",
    description: "IP geolocation",
    category: "Geocoding",
    auth: "No",
    https: false,
    cors: "Unknown",
    url: "https://ip-api.com/docs",
  },
  {
    name: "ipinfo.io",
    description: "IP address data (geolocation, ASN)",
    category: "Geocoding",
    auth: "apiKey",
    https: true,
    cors: "Unknown",
    url: "https://ipinfo.io/developers",
  },

  // News & Media
  {
    name: "NewsAPI",
    description: "Headlines and articles from news sources",
    category: "News",
    auth: "apiKey",
    https: true,
    cors: "Unknown",
    url: "https://newsapi.org/",
  },
  {
    name: "The Guardian",
    description: "Articles from The Guardian",
    category: "News",
    auth: "apiKey",
    https: true,
    cors: "Unknown",
    url: "https://open-platform.theguardian.com/",
  },
  {
    name: "New York Times",
    description: "NYT articles and archives",
    category: "News",
    auth: "apiKey",
    https: true,
    cors: "Unknown",
    url: "https://developer.nytimes.com/",
  },
  {
    name: "Reddit",
    description: "Reddit posts, comments, and subreddits",
    category: "News",
    auth: "OAuth",
    https: true,
    cors: "Unknown",
    url: "https://www.reddit.com/dev/api/",
  },
  {
    name: "Hacker News",
    description: "Tech news and discussions",
    category: "News",
    auth: "No",
    https: true,
    cors: "Unknown",
    url: "https://github.com/HackerNews/API",
  },
  {
    name: "Unsplash",
    description: "High-quality free images",
    category: "Media",
    auth: "apiKey",
    https: true,
    cors: "Unknown",
    url: "https://unsplash.com/documentation",
  },
  {
    name: "Pexels",
    description: "Free stock photos and videos",
    category: "Media",
    auth: "apiKey",
    https: true,
    cors: "Yes",
    url: "https://www.pexels.com/api/",
  },
  {
    name: "Giphy",
    description: "GIF search and sharing",
    category: "Media",
    auth: "apiKey",
    https: true,
    cors: "Unknown",
    url: "https://developers.giphy.com/docs/api/",
  },
  {
    name: "YouTube Data",
    description: "YouTube videos, channels, playlists",
    category: "Media",
    auth: "OAuth",
    https: true,
    cors: "Unknown",
    url: "https://developers.google.com/youtube/v3",
  },
  {
    name: "Spotify",
    description: "Music data, playlists, tracks, artists",
    category: "Media",
    auth: "OAuth",
    https: true,
    cors: "Unknown",
    url: "https://developer.spotify.com/documentation/web-api/",
  },

  // Science & Education
  {
    name: "NASA",
    description: "Astronomy picture of the day, Mars rover photos",
    category: "Science",
    auth: "No",
    https: true,
    cors: "Unknown",
    url: "https://api.nasa.gov/",
  },
  {
    name: "Wikipedia",
    description: "Wikipedia article content and search",
    category: "Science",
    auth: "No",
    https: true,
    cors: "Yes",
    url: "https://www.mediawiki.org/wiki/API:Main_page",
  },
  {
    name: "Open Library",
    description: "Book data and reading lists",
    category: "Science",
    auth: "No",
    https: true,
    cors: "No",
    url: "https://openlibrary.org/developers/api",
  },
  {
    name: "arXiv",
    description: "Academic paper metadata",
    category: "Science",
    auth: "No",
    https: true,
    cors: "Unknown",
    url: "https://arxiv.org/help/api/",
  },
  {
    name: "PubChem",
    description: "Chemical compound data",
    category: "Science",
    auth: "No",
    https: true,
    cors: "Yes",
    url: "https://pubchem.ncbi.nlm.nih.gov/docs/pug-rest",
  },

  // Productivity
  {
    name: "Todoist",
    description: "Task and project management",
    category: "Productivity",
    auth: "OAuth",
    https: true,
    cors: "Unknown",
    url: "https://developer.todoist.com/rest/",
  },
  {
    name: "Trello",
    description: "Kanban boards and project management",
    category: "Productivity",
    auth: "OAuth",
    https: true,
    cors: "Unknown",
    url: "https://developer.atlassian.com/cloud/trello/rest/",
  },
  {
    name: "Google Calendar",
    description: "Calendar and event management",
    category: "Productivity",
    auth: "OAuth",
    https: true,
    cors: "Unknown",
    url: "https://developers.google.com/calendar/api/v3/reference",
  },
  {
    name: "Calendly",
    description: "Scheduling and appointment management",
    category: "Productivity",
    auth: "OAuth",
    https: true,
    cors: "Unknown",
    url: "https://developer.calendly.com/",
  },
  {
    name: "Linear",
    description: "Issue tracking and project management",
    category: "Productivity",
    auth: "apiKey",
    https: true,
    cors: "Unknown",
    url: "https://developers.linear.app/",
  },

  // Cloud & Infrastructure
  {
    name: "AWS",
    description: "Amazon Web Services APIs",
    category: "Cloud",
    auth: "apiKey",
    https: true,
    cors: "Unknown",
    url: "https://docs.aws.amazon.com/",
  },
  {
    name: "Google Cloud",
    description: "Google Cloud Platform APIs",
    category: "Cloud",
    auth: "OAuth",
    https: true,
    cors: "Unknown",
    url: "https://cloud.google.com/apis",
  },
  {
    name: "DigitalOcean",
    description: "Cloud infrastructure management",
    category: "Cloud",
    auth: "apiKey",
    https: true,
    cors: "Unknown",
    url: "https://docs.digitalocean.com/reference/api/",
  },
  {
    name: "Cloudflare",
    description: "CDN, DNS, security, and edge computing",
    category: "Cloud",
    auth: "apiKey",
    https: true,
    cors: "Unknown",
    url: "https://developers.cloudflare.com/api/",
  },
  {
    name: "Fly.io",
    description: "App deployment and edge hosting",
    category: "Cloud",
    auth: "apiKey",
    https: true,
    cors: "Unknown",
    url: "https://fly.io/docs/machines/api/",
  },

  // Authentication & Identity
  {
    name: "Auth0",
    description: "Authentication and authorization platform",
    category: "Authentication",
    auth: "apiKey",
    https: true,
    cors: "Yes",
    url: "https://auth0.com/docs/api",
  },
  {
    name: "Clerk",
    description: "User management and authentication",
    category: "Authentication",
    auth: "apiKey",
    https: true,
    cors: "Unknown",
    url: "https://clerk.com/docs/reference/backend-api",
  },
  {
    name: "Firebase Auth",
    description: "Authentication with email, social, phone",
    category: "Authentication",
    auth: "apiKey",
    https: true,
    cors: "Yes",
    url: "https://firebase.google.com/docs/auth/web/start",
  },
  {
    name: "Okta",
    description: "Identity and access management",
    category: "Authentication",
    auth: "apiKey",
    https: true,
    cors: "Unknown",
    url: "https://developer.okta.com/docs/reference/api/",
  },

  // E-commerce
  {
    name: "Shopify",
    description: "E-commerce platform API",
    category: "E-commerce",
    auth: "OAuth",
    https: true,
    cors: "Unknown",
    url: "https://shopify.dev/docs/api",
  },
  {
    name: "WooCommerce",
    description: "WordPress e-commerce API",
    category: "E-commerce",
    auth: "apiKey",
    https: true,
    cors: "Unknown",
    url: "https://woocommerce.github.io/woocommerce-rest-api-docs/",
  },

  // Social
  {
    name: "Twitter/X",
    description: "Tweets, users, and timelines",
    category: "Social",
    auth: "OAuth",
    https: true,
    cors: "Unknown",
    url: "https://developer.x.com/en/docs",
  },
  {
    name: "Mastodon",
    description: "Decentralized social network API",
    category: "Social",
    auth: "OAuth",
    https: true,
    cors: "Unknown",
    url: "https://docs.joinmastodon.org/client/intro/",
  },
  {
    name: "LinkedIn",
    description: "Professional network API",
    category: "Social",
    auth: "OAuth",
    https: true,
    cors: "Unknown",
    url: "https://learn.microsoft.com/en-us/linkedin/shared/references/v2/",
  },

  // Utilities
  {
    name: "Abstract API",
    description: "IP geolocation, email validation, phone validation",
    category: "Utilities",
    auth: "apiKey",
    https: true,
    cors: "Yes",
    url: "https://www.abstractapi.com/",
  },
  {
    name: "QR Code Generator",
    description: "Generate QR codes",
    category: "Utilities",
    auth: "No",
    https: true,
    cors: "Yes",
    url: "https://goqr.me/api/",
  },
  {
    name: "URL Shortener (TinyURL)",
    description: "Shorten URLs",
    category: "Utilities",
    auth: "No",
    https: true,
    cors: "Unknown",
    url: "https://tinyurl.com/app/dev",
  },
  {
    name: "Lorem Ipsum",
    description: "Placeholder text generation",
    category: "Utilities",
    auth: "No",
    https: true,
    cors: "Unknown",
    url: "https://loripsum.net/",
  },

  // Automation
  {
    name: "Zapier",
    description: "Workflow automation platform",
    category: "Automation",
    auth: "apiKey",
    https: true,
    cors: "Unknown",
    url: "https://platform.zapier.com/",
  },
  {
    name: "IFTTT",
    description: "If-this-then-that automation",
    category: "Automation",
    auth: "apiKey",
    https: true,
    cors: "Unknown",
    url: "https://ifttt.com/docs",
  },
  {
    name: "Make (Integromat)",
    description: "Visual workflow automation",
    category: "Automation",
    auth: "apiKey",
    https: true,
    cors: "Unknown",
    url: "https://www.make.com/en/api-documentation",
  },

  // Health
  {
    name: "Open FDA",
    description: "FDA drug, device, and food data",
    category: "Health",
    auth: "No",
    https: true,
    cors: "Unknown",
    url: "https://open.fda.gov/apis/",
  },
  {
    name: "COVID-19 API",
    description: "COVID-19 statistics worldwide",
    category: "Health",
    auth: "No",
    https: true,
    cors: "Yes",
    url: "https://disease.sh/docs/",
  },

  // Gaming
  {
    name: "RAWG",
    description: "Video game database",
    category: "Gaming",
    auth: "apiKey",
    https: true,
    cors: "Unknown",
    url: "https://rawg.io/apidocs",
  },
  {
    name: "Steam",
    description: "Steam store and user data",
    category: "Gaming",
    auth: "apiKey",
    https: true,
    cors: "Unknown",
    url: "https://developer.valvesoftware.com/wiki/Steam_Web_API",
  },
  {
    name: "IGDB",
    description: "Internet Game Database",
    category: "Gaming",
    auth: "apiKey",
    https: true,
    cors: "Unknown",
    url: "https://api-docs.igdb.com/",
  },

  // Transportation
  {
    name: "Google Flights",
    description: "Flight search and prices",
    category: "Transportation",
    auth: "apiKey",
    https: true,
    cors: "Unknown",
    url: "https://developers.google.com/travel",
  },
  {
    name: "OpenSky Network",
    description: "Real-time flight tracking",
    category: "Transportation",
    auth: "No",
    https: true,
    cors: "Unknown",
    url: "https://openskynetwork.github.io/opensky-api/",
  },
];

/** Get unique categories from the catalog. */
function getCategories(): string[] {
  return [...new Set(PUBLIC_API_CATALOG.map((api) => api.category))].toSorted();
}

/** Search APIs by keyword. */
function searchApis(query: string, limit: number): PublicApiEntry[] {
  const lower = query.toLowerCase();
  return PUBLIC_API_CATALOG.filter(
    (api) =>
      api.name.toLowerCase().includes(lower) ||
      api.description.toLowerCase().includes(lower) ||
      api.category.toLowerCase().includes(lower),
  ).slice(0, limit);
}

/** Get APIs by category. */
function getByCategory(category: string, limit: number): PublicApiEntry[] {
  const lower = category.toLowerCase();
  return PUBLIC_API_CATALOG.filter((api) => api.category.toLowerCase() === lower).slice(0, limit);
}

/** Generate setup info for a specific API. */
function getSetupInfo(apiName: string):
  | {
      api: PublicApiEntry;
      setupGuide: string;
    }
  | undefined {
  const lower = apiName.toLowerCase();
  const api = PUBLIC_API_CATALOG.find((a) => a.name.toLowerCase() === lower);
  if (!api) {
    return undefined;
  }

  const lines: string[] = [
    `# ${api.name} Setup Guide`,
    "",
    `**Description:** ${api.description}`,
    `**Category:** ${api.category}`,
    `**Documentation:** ${api.url}`,
    `**HTTPS:** ${api.https ? "Yes" : "No"}`,
    `**CORS:** ${api.cors}`,
    "",
    "## Authentication",
  ];

  switch (api.auth) {
    case "No":
      lines.push("No authentication required. You can start making requests immediately.");
      break;
    case "apiKey":
      lines.push(
        "Requires an API key. Steps:",
        "1. Visit the documentation link above",
        "2. Create a free account (if required)",
        "3. Navigate to the API keys or developer section",
        "4. Generate a new API key",
        "5. Include the key in your requests (usually as a header or query parameter)",
        "",
        "**Typical header format:** `Authorization: Bearer YOUR_API_KEY` or `X-API-Key: YOUR_API_KEY`",
      );
      break;
    case "OAuth":
      lines.push(
        "Requires OAuth authentication. Steps:",
        "1. Visit the documentation link above",
        "2. Create a developer account/application",
        "3. Register your application to get Client ID and Client Secret",
        "4. Implement the OAuth 2.0 flow (authorization code or client credentials)",
        "5. Exchange authorization code for access token",
        "6. Use the access token in the Authorization header",
        "",
        "**Header format:** `Authorization: Bearer YOUR_ACCESS_TOKEN`",
        "",
        "Note: OAuth setup typically requires human intervention to authorize the application.",
      );
      break;
    default:
      lines.push(`Authentication type: ${api.auth}. Check the documentation for details.`);
  }

  return { api, setupGuide: lines.join("\n") };
}

export function createPublicApisTool(): AnyAgentTool {
  const tool: AnyAgentTool = {
    name: "public_apis",
    label: "Public APIs Catalog",
    description: [
      "Search and browse a curated catalog of 100+ public APIs across 20+ categories.",
      "Actions: search (by keyword), list_categories (available categories),",
      "by_category (APIs in a category), get_setup_info (setup guide with auth details).",
      "Includes APIs for weather, finance, AI, communication, data storage, maps, news,",
      "social media, cloud infra, authentication, e-commerce, gaming, and more.",
      "Each entry includes auth type, docs URL, and HTTPS/CORS support.",
    ].join(" "),
    parameters: PublicApisToolSchema,
    execute: async (_toolCallId, params: Record<string, unknown>) => {
      const action = readStringParam(params, "action", {
        required: true,
      }) as (typeof PUBLIC_APIS_ACTIONS)[number];

      try {
        switch (action) {
          case "search": {
            const query = readStringParam(params, "query", { required: true });
            const limit = (params.limit as number) ?? 20;
            const results = searchApis(query, limit);
            return jsonResult({
              query,
              count: results.length,
              total: PUBLIC_API_CATALOG.length,
              apis: results,
            });
          }

          case "list_categories": {
            const categories = getCategories();
            const categoryCounts = categories.map((cat) => ({
              category: cat,
              count: PUBLIC_API_CATALOG.filter((a) => a.category === cat).length,
            }));
            return jsonResult({ categories: categoryCounts, total: PUBLIC_API_CATALOG.length });
          }

          case "by_category": {
            const category = readStringParam(params, "category", { required: true });
            const limit = (params.limit as number) ?? 20;
            const results = getByCategory(category, limit);
            return jsonResult({ category, count: results.length, apis: results });
          }

          case "get_setup_info": {
            const apiName = readStringParam(params, "api_name", { required: true });
            const info = getSetupInfo(apiName);
            if (!info) {
              const suggestions = searchApis(apiName, 5);
              return jsonResult({
                error: `API not found: "${apiName}"`,
                suggestions: suggestions.map((s) => s.name),
              });
            }
            return jsonResult(info);
          }

          default:
            return jsonResult({ error: `Unknown action: ${String(action)}` });
        }
      } catch (err) {
        return jsonResult({
          error: err instanceof Error ? err.message : String(err),
        });
      }
    },
  };
  return tool;
}
