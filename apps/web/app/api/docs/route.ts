import { ApiReference } from "@scalar/nextjs-api-reference";

// Servir la spec OpenAPI JSON en /api/docs/spec
// La UI de Scalar se sirve en /api/docs (este handler)
export const GET = ApiReference({
  url: "/api/docs/spec",
  theme: "default",
  pageTitle: "POS Chile — API v1",
  metaData: {
    title: "POS Chile API v1",
    description: "Documentación interactiva de la API REST del sistema POS Chile",
  },
});
