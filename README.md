# Travian Def Helper

A tool to help Travian players manage village defense troops.

## Features
- **Tribe Selection:** Supports Romans, Teutons, Gauls, Egyptians, Huns, Spartans, and Vikings.
- **Source Code Parsing:** Paste the source code from your village statistics page (Troops tab) to extract data.
- **Data Analysis:** Calculates troop counts and determines the slowest unit speed for each village.

## How to Use
1.  Open the [live website](https://<your-username>.github.io/<repo-name>/) (once deployed).
2.  Select your tribe from the dropdown.
3.  In Travian, go to **Village Statistics** -> **Troops**.
4.  Press `Ctrl + U` (or right-click -> View Page Source) to view the page source.
5.  Copy the entire source code (`Ctrl + A`, `Ctrl + C`) and paste it into the text area.
6.  Click **Process Data**.

## Deployment
This project is configured for deployment via GitHub Pages.

### Option 1: GitHub Actions (Recommended)
This repository includes a GitHub Actions workflow (`.github/workflows/deploy.yml`).
1.  Push this code to a GitHub repository.
2.  Go to the repository **Settings** -> **Pages**.
3.  Under **Build and deployment**, select **GitHub Actions** as the source.
4.  The workflow will automatically run and deploy your site.

### Option 2: Deploy from Branch
1.  Push this code to a GitHub repository.
2.  Go to the repository **Settings** -> **Pages**.
3.  Under **Build and deployment**, select **Deploy from a branch**.
4.  Select `main` (or `master`) as the branch and `/ (root)` as the folder.
5.  Click **Save**.
