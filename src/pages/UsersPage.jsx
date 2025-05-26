import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFirebase } from '../firebase/FirebaseContext';
import { CircularProgress, Box } from '@mui/material'; // Import CircularProgress and Box for loading state
import {
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Snackbar,
  Alert
} from '@mui/material'
import {
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material'

function UsersPage() {
  const navigate = useNavigate();
  const { currentUser, getUsers, updateUser, deleteUser, loading } = useFirebase(); // Add loading state
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    if (!loading) {
      if (!currentUser || currentUser.role !== 'admin') {
        navigate('/login'); // Redirect to login if not admin or not logged in
        return;
      }

      const fetchUsers = async () => {
        try {
          const fetchedUsers = await getUsers();
          setUsers(fetchedUsers);
        } catch (error) {
          console.error("Error fetching users:", error);
          setSnackbar({
            open: true,
            message: 'Kullanıcılar yüklenirken bir hata oluştu.',
            severity: 'error'
          });
        }
      };
      fetchUsers();
    }
  }, [currentUser, loading, navigate, getUsers]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const handleEditClick = (user) => {
    setSelectedUser(user)
    setOpenDialog(true)
  }

  const handleDelete = async (userId) => {
    try {
      await deleteUser(userId);
      setUsers(prevUsers => prevUsers.filter(user => user.id !== userId)); // Kullanıcı listesini güncelle
      setSnackbar({
        open: true,
        message: 'Kullanıcı silindi',
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Kullanıcı silinirken bir hata oluştu',
        severity: 'error'
      })
    }
  }

  const handleDialogClose = () => {
    setOpenDialog(false)
    setSelectedUser(null)
  }

  const handleSave = async () => {
    if (!selectedUser) return

    try {
      await updateUser(selectedUser.id, selectedUser)
      setOpenDialog(false)
      setSnackbar({
        open: true,
        message: 'Kullanıcı bilgileri güncellendi',
        severity: 'success'
      })
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Kullanıcı güncellenirken bir hata oluştu',
        severity: 'error'
      })
    }
  }

  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false })
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Kullanıcı Yönetimi
      </Typography>
      
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Ad</TableCell>
              <TableCell>Soyad</TableCell>
              <TableCell>E-posta</TableCell>
              <TableCell>Telefon</TableCell>
              <TableCell>Şehir</TableCell>
              <TableCell>İlçe</TableCell>
              <TableCell>Mahalle</TableCell>
              <TableCell>Adres</TableCell>
              <TableCell>Rol</TableCell>
              <TableCell align="right">İşlemler</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.firstName}</TableCell>
                <TableCell>{user.lastName}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.phone}</TableCell>
                <TableCell>{user.city}</TableCell>
                <TableCell>{user.district}</TableCell>
                <TableCell>{user.neighborhood}</TableCell>
                <TableCell>{user.address}</TableCell>
                <TableCell>{user.role}</TableCell> {/* Display user role */}
                <TableCell align="right">
                  <IconButton onClick={() => handleEditClick(user)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(user.id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={handleDialogClose}>
        <DialogTitle>Kullanıcı Düzenle</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            label="Ad"
            fullWidth
            value={selectedUser?.firstName || ''}
            onChange={(e) => setSelectedUser({ ...selectedUser, firstName: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Soyad"
            fullWidth
            value={selectedUser?.lastName || ''}
            onChange={(e) => setSelectedUser({ ...selectedUser, lastName: e.target.value })}
          />
          <TextField
            margin="dense"
            label="E-posta"
            fullWidth
            disabled
            value={selectedUser?.email || ''}
          />
          <TextField
            margin="dense"
            label="Telefon"
            fullWidth
            value={selectedUser?.phone || ''}
            onChange={(e) => setSelectedUser({ ...selectedUser, phone: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Şehir"
            fullWidth
            value={selectedUser?.city || ''}
            onChange={(e) => setSelectedUser({ ...selectedUser, city: e.target.value })}
          />
          <TextField
            margin="dense"
            label="İlçe"
            fullWidth
            value={selectedUser?.district || ''}
            onChange={(e) => setSelectedUser({ ...selectedUser, district: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Mahalle"
            fullWidth
            value={selectedUser?.neighborhood || ''}
            onChange={(e) => setSelectedUser({ ...selectedUser, neighborhood: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Adres"
            fullWidth
            multiline
            rows={3}
            value={selectedUser?.address || ''}
            onChange={(e) => setSelectedUser({ ...selectedUser, address: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Şifre"
            type="password"
            fullWidth
            value={selectedUser?.password || ''}
            onChange={(e) => setSelectedUser({ ...selectedUser, password: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Rol"
            fullWidth
            value={selectedUser?.role || ''}
            onChange={(e) => setSelectedUser({ ...selectedUser, role: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>İptal</Button>
          <Button onClick={handleSave} variant="contained" color="primary">
            Kaydet
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  )
}

export default UsersPage