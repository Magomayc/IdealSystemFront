import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// --- LAYOUT E LOGIN ---
import { Layout } from './components/Layout/Layout';
import { Login } from './pages/Login/Login';

// --- PÁGINAS GERAIS ---
import MenuDashboard from './pages/Menu/Menu';
import { Usuario } from './pages/Usuario/Usuario'; 

// --- GESTÃO DE USUÁRIOS ---
import { Usuarios } from './pages/Usuarios/Usuarios';
import { NovoUsuario } from './pages/NovoUsuario/NovoUsuario';
import { EditarUsuario } from './pages/EditarUsuario/EditarUsuario';

// --- GESTÃO DE ANIMAIS ---
import { Animais } from './pages/Animais/Animais';
import { NovoAnimal } from './pages/NovoAnimal/NovoAnimal';
import { EditarAnimal } from './pages/EditarAnimal/EditarAnimal';
import { Animal } from './pages/Animal/Animal'; // 👇 NOVO IMPORT

// --- GESTÃO DE VENDAS E BAIXAS ---
import { Vendas } from './pages/Vendas/Vendas'; 
import Venda from './pages/Venda/Venda'; 
import { NovaVenda } from './pages/NovaVenda/NovaVenda'; 
import { NovaBaixa } from './pages/NovaBaixa/NovaBaixa';

// --- GESTÃO DE INSUMOS (MILHO) ---
import { Milhos } from './pages/Milhos/Milhos'; 
import Milho from './pages/Milho/Milho'; 
import { NovoMilho } from './pages/NovoMilho/NovoMilho'; 
import { SaidaMilho } from './pages/SaidaMilho/SaidaMilho'; 

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* --- ROTAS PÚBLICAS --- */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />

        {/* --- ROTAS PRIVADAS --- */}
        <Route element={<Layout />}>
            
            <Route path="/menu" element={<MenuDashboard />} />

            {/* USUÁRIOS */}
            <Route path="/usuarios" element={<Usuarios />} />
            <Route path="/novoUsuario" element={<NovoUsuario />} />
            <Route path="/editarUsuario/:id" element={<EditarUsuario />} />

            {/* ANIMAIS */}
            <Route path="/animais" element={<Animais />} />
            <Route path="/novoAnimal" element={<NovoAnimal />} />
            <Route path="/editarAnimal/:id" element={<EditarAnimal />} />
            <Route path="/animais/:id" element={<Animal />} /> {/* 👇 NOVA ROTA */}

            {/* VENDAS */}
            <Route path="/vendas" element={<Vendas />} />
            <Route path="/vendas/nova" element={<NovaVenda />} />         
            <Route path="/vendas/:id" element={<Venda />} />      

            {/* BAIXAS (MORTES E PERDAS) */}
            <Route path="/baixas/nova" element={<NovaBaixa />} /> 
            <Route path="/baixas/:id" element={<Venda />} /> 

            {/* GESTÃO DE MILHO / ESTOQUE */}
            <Route path="/milhos" element={<Milhos />} /> 
            <Route path="/milho/nova-compra" element={<NovoMilho />} /> 
            <Route path="/milho/editar/:id" element={<NovoMilho />} />  
            <Route path="/milho/nova-saida" element={<SaidaMilho />} /> 
            <Route path="/milho/:id" element={<Milho />} /> 

            {/* PERFIL */}
            <Route path="/perfil" element={<Usuario />} />
            
            <Route path="/NovoProduto" element={<div style={{padding: 20}}>Página em construção...</div>} />
        </Route>

        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;