# NexJob (NexJob)

> **Connecting exceptional builders with category-defining companies.**

NexJob is a modern, responsive web application designed to help job seekers find their next role in engineering, design, and product at top-tier companies like Stripe, Supabase, Linear, and Figma. 

## ✨ Features

- **Job Exploration**: Browse through a curated list of opportunities across various disciplines.
- **Save Roles**: Bookmark your favorite jobs for later viewing. Uses local storage to keep your saved roles across sessions.
- **Dark & Light Modes**: Seamlessly toggle between "Tokyo Night Dark" and "Emerald Porcelain Light" themes for optimal viewing comfort.
- **Responsive Design**: Fully responsive interface that looks great on desktop, tablet, and mobile devices.
- **Fast & Lightweight**: Built with Vanilla JS, HTML, and CSS without any heavy frameworks.

## 🛠️ Technology Stack

- **HTML5**: Semantic markup for better accessibility and SEO.
- **CSS3 (Vanilla)**: Custom styling with modern features like CSS variables, flexbox, and grid.
- **JavaScript (ES6+)**: Modular vanilla JavaScript for fetching data (`api.js`), handling UI interactions (`ui.js`), and managing local storage (`storage.js`).
- **Fonts**: Inter and Outfit from Google Fonts.

## 🚀 Getting Started

### Prerequisites

You only need a modern web browser to run this project. If you wish to serve it locally, a simple HTTP server (like VS Code Live Server or Python's `http.server`) is recommended because of the use of ES modules and fetch API.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/IkjotSingh-13/nexjob.git
   ```

2. Navigate into the project directory:
   ```bash
   cd nexjob
   ```

3. Open the project:
   - **Using VS Code**: Right-click on `index.html` and select "Open with Live Server".
   - **Using Python**: Run `python -m http.server` and open `http://localhost:8000` in your browser.

## 📂 Project Structure

- `index.html`: The main entry point of the application.
- `style.css`: Contains all the styling for the application including theme variables.
- `main.js`: Main JavaScript file that initializes the application.
- `api.js`: Handles asynchronous fetching of job listings.
- `ui.js`: Manages DOM manipulation and UI state.
- `storage.js`: Handles saving and retrieving bookmarked jobs from local storage.
- `jobs.json`: A static JSON file containing the mock job data.

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
