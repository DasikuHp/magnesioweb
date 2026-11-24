// Ruta de un fichero de public/ teniendo en cuenta el basePath de GitHub Pages.
export const asset = (path: string) => `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${path}`;
