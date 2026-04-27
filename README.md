# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## 📦 Model Downloads

These models are too large for GitHub. Download manually and place in `backend/weights/`:

| Model | Download |
|-------|----------|
| Semantic Model (disaster_pro_model_BEST.pt) | [Download](https://drive.google.com/file/d/1bn0nNm0GPKfEZ-wZ9DC8Ngov_7AXFC06/view?usp=sharing) |
| Forensic Model (forensic_v2_model_BEST.pt) | [Download](https://drive.google.com/file/d/1gUnvMpDenDIMbe_4apTFhvbhZGEEUkeo/view?usp=sharing) |

After downloading, place files here:
backend/
└── weights/
    ├── disaster_pro_model_BEST.pt
    └── forensic_v2_model_BEST.pt
