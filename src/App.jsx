import { Routes, Route, Navigate } from 'react-router-dom'
import StoreLayout from './components/StoreLayout.jsx'
import Store from './pages/Store.jsx'
import ProductDetail from './pages/ProductDetail.jsx'
import Checkout from './pages/Checkout.jsx'
import CheckoutStatus from './pages/CheckoutStatus.jsx'
import SellerPage from './pages/SellerPage.jsx'
import CustomPage from './pages/CustomPage.jsx'
import MinhaConta from './pages/MinhaConta.jsx'
import Login from './pages/admin/Login.jsx'
import AdminLayout from './components/AdminLayout.jsx'
import Dashboard from './pages/admin/Dashboard.jsx'
import ProductList from './pages/admin/ProductList.jsx'
import ProductForm from './pages/admin/ProductForm.jsx'
import Perfil from './pages/admin/Perfil.jsx'
import Aparencia from './pages/admin/Aparencia.jsx'
import PaginasList from './pages/admin/PaginasList.jsx'
import PaginaForm from './pages/admin/PaginaForm.jsx'
import PaginaCategoriasList from './pages/admin/PaginaCategoriasList.jsx'
import CategoriasList from './pages/admin/CategoriasList.jsx'
import BannerList from './pages/admin/BannerList.jsx'
import ParcelamentoList from './pages/admin/ParcelamentoList.jsx'
import EquipeList from './pages/admin/EquipeList.jsx'
import MapaDoSite from './pages/admin/MapaDoSite.jsx'
import MenuList from './pages/admin/MenuList.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'

export default function App() {
  return (
    <Routes>
      {/* Loja pública */}
      <Route element={<StoreLayout />}>
        <Route path="/" element={<Store />} />
        <Route path="/categoria/:slugCategoria" element={<Store />} />
        <Route path="/categoria/:slugCategoria/:slugSubcategoria" element={<Store />} />
        <Route path="/categoria/:categoriaSlug/produto/:tituloSlug" element={<ProductDetail />} />
        <Route path="/checkout/:id" element={<Checkout />} />
        <Route path="/checkout/status" element={<CheckoutStatus />} />
        <Route path="/pagina/:slug" element={<CustomPage />} />
        <Route path="/minha-conta" element={<MinhaConta />} />
        {/* Link pessoal de cada vendedor, ex: reigames.com.br/joao — fica por
            último entre as rotas da loja pública porque é a mais "genérica";
            o React Router já dá prioridade às rotas com trecho fixo acima. */}
        <Route path="/:slug" element={<SellerPage />} />
      </Route>

      {/* Painel administrativo */}
      <Route path="/admin/login" element={<Login />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="produtos" element={<ProductList />} />
        <Route path="produtos/novo" element={<ProductForm />} />
        <Route path="produtos/:id" element={<ProductForm />} />
        <Route path="perfil" element={<Perfil />} />
        <Route path="aparencia" element={<Aparencia />} />
        <Route path="paginas" element={<PaginasList />} />
        <Route path="paginas/nova" element={<PaginaForm />} />
        <Route path="paginas/:id" element={<PaginaForm />} />
        <Route path="categorias-pagina" element={<PaginaCategoriasList />} />
        <Route path="categorias" element={<CategoriasList />} />
        <Route path="banner" element={<BannerList />} />
        <Route path="parcelamento" element={<ParcelamentoList />} />
        <Route path="equipe" element={<EquipeList />} />
        <Route path="mapa-do-site" element={<MapaDoSite />} />
        <Route path="menu" element={<MenuList />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
