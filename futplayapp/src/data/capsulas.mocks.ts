export type Capsula = {
    id: string;
    titulo: string;
    imagen: string;
    coach: string;
    categoria: string;
    duracion: string;
};

export const capsulasMock: Capsula[] = [
    {
        id: "1",
        titulo: "Control orientado y primer toque",
        imagen: "https://images.unsplash.com/photo-1570498839593-e565b39455fc",
        coach: "Juan Pérez",
        categoria: "Control",
        duracion: "12 min",
    },
    {
        id: "2",
        titulo: "Precisión en pases cortos y rápidos",
        imagen: "https://images.unsplash.com/photo-1517927033932-b3d18e61fb3a",
        coach: "Martín Salas",
        categoria: "Pase",
        duracion: "15 min",
    },
    {
        id: "3",
        titulo: "Dribbling en espacios reducidos",
        imagen: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2",
        coach: "Diego Rojas",
        categoria: "Regate",
        duracion: "18 min",
    },
    {
        id: "4",
        titulo: "Finalización dentro del área",
        imagen: "https://images.unsplash.com/photo-1522778119026-d647f0596c20",
        coach: "Carlos Muñoz",
        categoria: "Definición",
        duracion: "20 min",
    },
    {
        id: "5",
        titulo: "Dominio de balón y coordinación",
        imagen: "https://images.unsplash.com/photo-1517466787929-bc90951d0974",
        coach: "Sebastián Vargas",
        categoria: "Técnica",
        duracion: "10 min",
    },
    {
        id: "6",
        titulo: "Cambios de ritmo y dirección",
        imagen: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2",
        coach: "Andrés Fuentes",
        categoria: "Agilidad",
        duracion: "14 min",
    },
];