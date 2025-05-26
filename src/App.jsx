import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import HomePage from './pages/HomePage'
import ProfilePage from './pages/ProfilePage'
import AdminPage from './pages/AdminPage'
import UsersPage from './pages/UsersPage'
import DemandsPage from './pages/DemandsPage'
import Dashboard from './components/Dashboard'
import { AppBar, Toolbar, Typography, Button, Box, Drawer, List, ListItem, ListItemIcon, ListItemText, IconButton, useMediaQuery } from '@mui/material'
import { useNavigate, useLocation } from 'react-router-dom'
import { Home, Person, ExitToApp, Dashboard as DashboardIcon, AdminPanelSettings, Group, ListAlt, Menu as MenuIcon } from '@mui/icons-material'
import { useTheme } from '@mui/material/styles'

import { useFirebase } from './firebase/FirebaseContext'; // Import useFirebase

function Header() {
  const navigate = useNavigate()
  const location = useLocation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [mobileOpen, setMobileOpen] = useState(false)
  const { currentUser, loading } = useFirebase(); // Get currentUser and loading state from FirebaseContext

  // const currentUser = JSON.parse(localStorage.getItem('currentUser')) // Remove localStorage usage
  // const isAdmin = currentUser?.email === 'admin@esans.com' // Remove old isAdmin check
  const isAdmin = !loading && currentUser && currentUser.role === 'admin'; // Check role after loading
  const isLoginPage = ['/login', '/register', '/'].includes(location.pathname)

  if (loading) {
    // Optionally, render a loading state for the header or return null
    return null; // Or a loading spinner, or minimal header
  }

  if (isLoginPage) return null

  const menuItems = [
    { text: 'Ana Sayfa', icon: <Home />, path: '/home' },
    { text: 'Profilim', icon: <Person />, path: '/profile' },
    ...(isAdmin ? [
      { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
      { text: 'Yönetici Paneli', icon: <AdminPanelSettings />, path: '/admin' },
      { text: 'Kullanıcı Yönetimi', icon: <Group />, path: '/users' },
      { text: 'Talep Listesi', icon: <ListAlt />, path: '/demands' },
    ] : []),
    { text: 'Çıkış', icon: <ExitToApp />, path: '/login' },
  ]

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const drawer = (
    <>
      <Toolbar sx={{ 
        justifyContent: 'center', 
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        minHeight: '64px !important'
      }}>
        <Typography variant="h6" component="div">
          Esans Talep Sistemi
        </Typography>
      </Toolbar>
      <List>
        {menuItems.map((item) => (
          <ListItem
            button
            key={item.text}
            onClick={() => {
              navigate(item.path)
              if (isMobile) {
                handleDrawerToggle()
              }
            }}
            sx={{
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.1)',
              },
              '&.Mui-selected': {
                backgroundColor: 'rgba(255,255,255,0.2)',
              },
              my: 0.5,
              mx: 1,
              borderRadius: 1,
            }}
            selected={location.pathname === item.path}
          >
            <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>
    </>
  )

  return (
    <>
      <AppBar
        position="fixed"
        sx={{
          display: { sm: 'none' },
          backgroundColor: '#3366CC',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            Esans Talep Sistemi
          </Typography>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { sm: 240 }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              width: 240,
              boxSizing: 'border-box',
              backgroundImage: 'linear-gradient(180deg, #3366CC 0%, #4B7BE5 100%)',
              color: 'white',
            },
          }}
        >
          {drawer}
        </Drawer>

        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              width: 240,
              boxSizing: 'border-box',
              backgroundImage: 'linear-gradient(180deg, #3366CC 0%, #4B7BE5 100%)',
              color: 'white',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
    </>
  )
}

function App() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Header />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          bgcolor: '#f5f7fb',
          display: 'flex',
          flexDirection: 'column',
          mt: { xs: '64px', sm: 0 }
        }}
      >
        <Toolbar sx={{ display: { sm: 'none' } }} />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/demands" element={<DemandsPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </Box>
    </Box>
  )
}

export default App