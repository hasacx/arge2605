import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Box, Container, TextField, Button, Typography, Paper, Snackbar } from '@mui/material'
import MuiAlert from '@mui/material/Alert'
import { useFirebase } from '../firebase/FirebaseContext'

function LoginPage() {
  const navigate = useNavigate()
  const { login } = useFirebase()

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [openSnackbar, setOpenSnackbar] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    setError('')
  }

  const validateForm = () => {
    if (!formData.email || !formData.password) {
      setError('Lütfen tüm alanları doldurun')
      return false
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setError('Geçerli bir e-posta adresi girin')
      return false
    }

    if (formData.password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır')
      return false
    }

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    // Test amaçlı admin kullanıcısı için geçici çözüm
    if (formData.email === 'admin@test.com' && formData.password === 'admin123') {
      // Başarılı giriş simülasyonu
      setOpenSnackbar(true)
      setTimeout(() => {
        // Admin kullanıcısı olarak localStorage'a bilgi kaydedelim
        localStorage.setItem('currentUser', JSON.stringify({
          uid: 'test-admin-id',
          email: 'admin@test.com',
          role: 'admin',
          firstName: 'Test',
          lastName: 'Admin'
        }))
        navigate('/home')
      }, 1500)
      return
    }

    try {
      await login(formData.email, formData.password)
      setOpenSnackbar(true)
      setTimeout(() => {
        navigate('/home')
      }, 1500)
    } catch (error) {
      setError('Email veya şifre hatalı')
      setOpenSnackbar(true)
    }
  }

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false)
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#3366CC',
        backgroundImage: 'linear-gradient(135deg, #3366CC 0%, #4B7BE5 100%)',
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          width: '100%',
          maxWidth: 400,
          borderRadius: 2,
          bgcolor: 'rgba(255, 255, 255, 0.95)',
        }}
      >
        <Box
          sx={{
            mb: 3,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Typography
            component="h1"
            variant="h5"
            sx={{
              color: '#1A237E',
              fontWeight: 'bold',
              mb: 1,
            }}
          >
            Esans Takip Sistemi
          </Typography>
        </Box>
        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="E-posta Adresi"
            name="email"
            autoComplete="email"
            autoFocus
            value={formData.email}
            onChange={handleChange}
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: '#3366CC',
                },
                '&:hover fieldset': {
                  borderColor: '#1A237E',
                },
              },
            }}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Şifre"
            type="password"
            id="password"
            autoComplete="current-password"
            value={formData.password}
            onChange={handleChange}
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: '#3366CC',
                },
                '&:hover fieldset': {
                  borderColor: '#1A237E',
                },
              },
            }}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{
              mt: 3,
              mb: 2,
              bgcolor: '#3366CC',
              '&:hover': {
                bgcolor: '#1A237E',
              },
              borderRadius: 1,
            }}
          >
            Giriş Yap
          </Button>
          <Typography align="center" sx={{ mt: 2 }}>
            <Link to="/register" style={{ textDecoration: 'none', color: '#3366CC' }}>
              Hesabınız yok mu? Kayıt Ol
            </Link>
          </Typography>

        </Box>
      </Paper>
      {error && (
        <Snackbar open={!!error} autoHideDuration={3000} onClose={() => setError('')}>
          <MuiAlert elevation={6} variant="filled" severity="error" onClose={() => setError('')}>
            {error}
          </MuiAlert>
        </Snackbar>
      )}
      <Snackbar open={openSnackbar} autoHideDuration={1500} onClose={handleCloseSnackbar}>
        <MuiAlert elevation={6} variant="filled" severity="success">
          Giriş başarılı! Yönlendiriliyorsunuz...
        </MuiAlert>
      </Snackbar>
    </Box>
  )
}

export default LoginPage