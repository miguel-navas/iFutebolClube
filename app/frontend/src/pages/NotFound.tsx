import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen text-white flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Página não encontrada</h1>
        <p className="text-[#94A3B8] mt-2">O endereço que você abriu não existe.</p>
        <Link to="/" className="text-[#D4AF37] mt-4 inline-block hover:underline">
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
