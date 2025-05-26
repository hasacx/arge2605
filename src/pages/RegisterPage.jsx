import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Box, Container, TextField, Button, Typography, Paper, Snackbar } from '@mui/material'
import MuiAlert from '@mui/material/Alert'
import { useFirebase } from '../firebase/FirebaseContext'

function RegisterPage() {
  const navigate = useNavigate()
  const { register } = useFirebase()

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    city: '',
    district: '',
    neighborhood: '',
    address: ''
  })
  const [errors, setErrors] = useState({})
  const [openSnackbar, setOpenSnackbar] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    let newValue = value
    
    if (name === 'phone' && value) {
      newValue = value.startsWith('0') ? value : '0' + value
      newValue = newValue.slice(0, 11)
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }))
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const newErrors = {}

    // Form doğrulama işlemleri
    if (formData.password.length < 6 || formData.password.length > 20) {
      newErrors.password = 'Şifre 6-20 karakter arasında olmalıdır'
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Geçerli bir email adresi giriniz'
    }

    const phoneRegex = /^0[0-9]{10}$/
    if (!phoneRegex.test(formData.phone)) {
      newErrors.phone = 'Geçerli bir telefon numarası giriniz (0 ile başlayan 11 haneli numara)'
    }

    // Tüm alanların dolu olduğunu kontrol et
    Object.keys(formData).forEach(key => {
      if (!formData[key]) {
        newErrors[key] = 'Bu alan zorunludur'
      }
    })

    // Hatalar varsa formu gönderme
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    // Kayıt işlemi başlamadan önce konsola bilgi yazdır
    console.log("Kayıt işlemi başlıyor:", { 
      email: formData.email, 
      password: formData.password.length + " karakter", // şifrenin kendisini değil uzunluğunu yazdır
      firstName: formData.firstName,
      lastName: formData.lastName
    });

    try {
      // Form verilerini ayır
      const { email, password, ...userData } = formData
      
      // Email ve şifrenin geçerli olduğunu kontrol et
      if (!email || !password) {
        console.error("Email veya şifre boş:", { email: !!email, password: !!password });
        setErrors({ submit: 'Email ve şifre alanları boş olamaz.' });
        return;
      }

      console.log("Register fonksiyonu çağrılıyor...");
      
      // Kayıt işlemini gerçekleştir
      const user = await register(email, password, {
        ...userData,
        role: 'user'
      })

      console.log("Kayıt başarılı:", user);
      
      // Başarılı kayıt sonrası işlemler
      setOpenSnackbar(true)
      
      // Formu sıfırla
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        phone: '',
        city: '',
        district: '',
        neighborhood: '',
        address: ''
      })
      
      // Giriş sayfasına yönlendir
      setTimeout(() => {
        navigate('/login')
      }, 2000)
    } catch (error) {
      console.error('Kayıt hatası:', error);
      
      // Firebase hata kodlarına göre özel mesajlar
      if (error.code === 'auth/email-already-in-use') {
        setErrors({ email: 'Bu email adresi zaten kayıtlı' });
      } else if (error.code === 'auth/weak-password') {
        setErrors({ password: 'Şifre yeterince güçlü değil (en az 6 karakter olmalı)' });
      } else if (error.code === 'auth/invalid-email') {
        setErrors({ email: 'Geçersiz email formatı' });
      } else if (error.code === 'auth/network-request-failed') {
        setErrors({ submit: 'Ağ bağlantısı hatası. Lütfen internet bağlantınızı kontrol edin.' });
      } else if (error.code === 'auth/too-many-requests') {
        setErrors({ submit: 'Çok fazla deneme yapıldı. Lütfen daha sonra tekrar deneyin.' });
      } else {
        // Genel hata mesajı
        let errorMessage = 'Kayıt sırasında bir hata oluştu. Lütfen daha sonra tekrar deneyin.';
        if (error.message) {
          errorMessage = `Kayıt hatası: ${error.message}`;
        }
        setErrors({ submit: errorMessage });
      }
    }
  }

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false)
  }

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Typography component="h1" variant="h5" align="center" gutterBottom>
            Kayıt Ol
          </Typography>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="firstName"
              label="Ad"
              name="firstName"
              autoFocus
              value={formData.firstName}
              onChange={handleChange}
              error={!!errors.firstName}
              helperText={errors.firstName}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              id="lastName"
              label="Soyad"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              error={!!errors.lastName}
              helperText={errors.lastName}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="E-posta Adresi"
              name="email"
              autoComplete="email"
              value={formData.email}
              onChange={handleChange}
              error={!!errors.email}
              helperText={errors.email}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Şifre"
              type="password"
              id="password"
              autoComplete="new-password"
              value={formData.password}
              onChange={handleChange}
              error={!!errors.password}
              helperText={errors.password || '6-20 karakter arası olmalıdır'}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              id="phone"
              label="Telefon Numarası"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              error={!!errors.phone}
              helperText={errors.phone || '11 haneli telefon numarası (0 ile başlar)'}
              inputProps={{ maxLength: 11 }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              id="city"
              label="İl"
              name="city"
              value={formData.city}
              onChange={handleChange}
              error={!!errors.city}
              helperText={errors.city}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              id="district"
              label="İlçe"
              name="district"
              value={formData.district}
              onChange={handleChange}
              error={!!errors.district}
              helperText={errors.district}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              id="neighborhood"
              label="Mahalle"
              name="neighborhood"
              value={formData.neighborhood}
              onChange={handleChange}
              error={!!errors.neighborhood}
              helperText={errors.neighborhood}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              id="address"
              label="Açık Adres"
              name="address"
              value={formData.address}
              onChange={handleChange}
              error={!!errors.address}
              helperText={errors.address}
              multiline
              rows={3}
            />
            {/* Genel hata mesajı */}
            {errors.submit && (
              <Box sx={{ mt: 2, p: 2, bgcolor: '#ffebee', borderRadius: 1, color: 'error.main' }}>
                <Typography variant="body2">{errors.submit}</Typography>
              </Box>
            )}
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
            >
              Kayıt Ol
            </Button>
            <Typography align="center">
              Zaten hesabınız var mı?{' '}
              <Link to="/login" style={{ textDecoration: 'none' }}>
                Giriş Yap
              </Link>
            </Typography>
          </Box>
        </Paper>
      </Box>
      <Snackbar open={openSnackbar} autoHideDuration={2000} onClose={handleCloseSnackbar}>
        <MuiAlert elevation={6} variant="filled" severity="success">
          Kayıt başarılı! Giriş sayfasına yönlendiriliyorsunuz...
        </MuiAlert>
      </Snackbar>
    </Container>
  )
}

export default RegisterPage
