# OmniDelivery AI Rules

This document outlines the technical stack and guidelines for developing the OmniDelivery application.

## Tech Stack Overview

*   **Frontend Framework**: React with TypeScript for building dynamic user interfaces.
*   **Styling**: Tailwind CSS for utility-first styling, ensuring a consistent and responsive design.
*   **Icons**: Lucide React for a comprehensive set of customizable SVG icons.
*   **AI Integration**: Google GenAI (`@google/genai`) for integrating AI capabilities, such as generating product descriptions and marketing taglines.
*   **Routing**: A custom hash-based routing system is currently in place for navigation between different sections of the application.
*   **State Management/Data Persistence**: Local Storage is used for client-side data persistence, managing products, store profiles, orders, and user addresses.
*   **Build Tool**: Vite is used for a fast development experience and optimized builds.
*   **UI Components**: Shadcn/ui components are available for building accessible and customizable UI elements.
*   **Charting**: Recharts is available for data visualization, though not currently implemented.

## Library Usage Rules

To maintain consistency and efficiency, please adhere to the following guidelines when developing:

*   **React & TypeScript**: All new components and logic should be written using React and TypeScript.
*   **Styling**:
    *   **ALWAYS** use Tailwind CSS classes for all styling. Avoid inline styles or creating new `.css` files unless absolutely necessary for global styles (which should be minimal and added to `index.css`).
    *   Prioritize responsive design using Tailwind's utility classes.
*   **Icons**: Use icons exclusively from the `lucide-react` library.
*   **AI Features**: For any AI-related functionalities, utilize the `@google/genai` library as demonstrated in `services/geminiService.ts`.
*   **Routing**: Continue using the existing hash-based routing mechanism for navigation. If a more complex routing solution is required, `react-router-dom` can be considered, but discuss first.
*   **Data Persistence**: For client-side data storage, use `localStorage` via `storageService.ts`.
*   **UI Components**:
    *   Leverage `shadcn/ui` components whenever possible for common UI elements (buttons, forms, dialogs, etc.).
    *   If a `shadcn/ui` component doesn't fit the exact need, create a new custom component in `src/components/` using Tailwind CSS. Do not modify existing `shadcn/ui` component files directly.
*   **Charting**: If data visualization is needed, use `recharts`.
*   **File Structure**:
    *   New React components should be placed in `src/components/`.
    *   New pages should be placed in `src/pages/`.
    *   Utility functions and services should reside in `src/services/` or `src/utils/`.