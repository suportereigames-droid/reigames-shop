import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import StoreLayout from './components/StoreLayout.jsx'
import AdminLayout from './components/AdminLayout.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'

const Store = lazy(() => import('./pages/Store.jsx'))
const ProductDetail = lazy(() => import('./pages/ProductDetail.jsx'))
const Checkout = lazy(() => import('./pages/Checkout.jsx'))
const CheckoutStatus = lazy(() => import('./pages/CheckoutStatus.jsx'))
const SellerPage = lazy(() => import('./pages/SellerPage.jsx'))
const CustomPage = lazy(() => import('./pages/CustomPage.jsx'))
const MinhaConta = lazy(() => import('./pages/MinhaConta.jsx'))
const Login = lazy(() => import('./pages/admin/Login.jsx'))
const Dashboard = lazy(() => import('./pages/admin/Dashboard.jsx'))
const ProductList = lazy(() => import('./pages/admin/ProductList.jsx'))
const ProductForm = lazy(() => import('./pages/admin/ProductForm.jsx'))
const Perfil = lazy(() => import('./pages/admin/Perfil.jsx'))
const Aparencia = lazy(() => import('./pages/admin/Aparencia.jsx'))
const PaginasList = lazy(() => import('./pages/admin/PaginasList.jsx'))
const PaginaForm = lazy(() => import('./pages/admin/PaginaForm.jsx'))
const PaginaCategoriasList = lazy(() => import('./pages/admin/PaginaCategoriasList.jsx'))
const CategoriasList = lazy(() => import('./pages/admin/CategoriasList.jsx'))
const BannerList = lazy(() => import('./pages/admin/BannerList.jsx'))
const ParcelamentoList = lazy(() => import('./pages/admin/ParcelamentoList.jsx'))
const EquipeList = lazy(() => import('./pages/admin/EquipeList.jsx'))
const MapaDoSite = lazy(() => import('./pages/admin/MapaDoSite.jsx'))
const MenuList = lazy(() => import('./pages/admin/MenuList.jsx'))

function Carregando() {
  return <p className="mx-auto max-w-4xl px-4 py-10 text-mist">Carregando...</p>
}

export default function App() {
  return (
    <Suspense fallback={<Carregando />}>
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
    </Suspense>
  )
}
