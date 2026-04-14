import { Metadata } from 'next';
import Hero from "../../../components/landingPage/Hero";
import About from "../../../components/landingPage/About";
import Benefits from "../../../components/landingPage/Benefits";
import Bento from "../../../components/landingPage/Bento";
import Footer from "../../../components/landingPage/Footer";
import Elearning from "../../../components/landingPage/Elearning";

export const metadata: Metadata = {
  title: "Futplay | Academia de Fútbol de Alto Rendimiento en Quilpué y Reñaca",
  description: "Únete a Futplay, academia de fútbol de alto rendimiento. Entrena estilo Barcelona, mejora tácticas con cápsulas E-learning y lleva tu nivel al máximo en Quilpué y Reñaca.",
  keywords: ["academia de fútbol", "alto rendimiento", "Quilpué", "Reñaca", "entrenamiento de fútbol precesial", "estilo Barcelona", "e-learning fútbol", "fútbol competitivo", "Futplay", "rendimiento deportivo"],
  openGraph: {
    title: "Futplay | Academia de Fútbol de Alto Rendimiento",
    description: "Lleva tu nivel al mundo competitivo. Mejora técnica y tácticamente con nuestras clases físicas en Quilpué y Reñaca y nuestras cápsulas digitales de aprendizaje.",
    url: 'https://futplay.cl',
    siteName: 'Futplay Academia',
    locale: 'es_CL',
    type: 'website',
  }
};

export default function Home() {
  return (
    <main className="bg-white min-h-screen font-sans">
      <Hero />
      <Benefits />
      <About />
      <Elearning />
      <Bento />
      <Footer />
    </main>
  );
}