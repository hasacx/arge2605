import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFirebase } from '../firebase/FirebaseContext' // useFirebase hook provides subscribeToDemands
import {
  Box,
  Container,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  IconButton,
  Collapse,
  Chip,
  Checkbox,
  Tooltip
} from '@mui/material'
import MuiAlert from '@mui/material/Alert'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  CheckCircle as CheckCircleIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  Autorenew,
  DeleteSweep as DeleteSweepIcon
} from '@mui/icons-material'
import * as XLSX from 'xlsx'

function AdminPage() {
  const navigate = useNavigate();
  const { currentUser, loading } = useFirebase(); // Get currentUser and loading state from context

  useEffect(() => {
    if (!loading) { // Only run check if not loading
      if (!currentUser) {
        // Not logged in, or currentUser is null after loading
        console.log('AdminPage: Not logged in, redirecting.');
        navigate('/'); // Redirect if not logged in
      } else if (currentUser.role !== 'admin') {
        console.log('Current user is not admin, redirecting. Role:', currentUser?.role, 'Email:', currentUser?.email); // Debugging line
        navigate('/'); // Redirect non-admin users
      }
      // If currentUser exists and role is 'admin', do nothing (allow access)
    }
  }, [currentUser, loading, navigate]);

  if (loading) {
    return <Typography>Loading admin data...</Typography>; // Or a spinner component
  }

  // If not loading and not admin (and useEffect hasn't redirected yet, though it should have),
  // you could add an additional check here, but useEffect should handle it.
  // However, to prevent rendering the page content briefly for non-admins before redirect:
  if (!currentUser || currentUser.role !== 'admin') {
    // This check is a safeguard. The useEffect should ideally handle the redirect before this point.
    // It prevents rendering the admin content if the redirect hasn't happened yet.
    return null; // Or a message, or rely on useEffect to redirect
  }

  // currentUser is already destructured above
  const { subscribeToEssences, addEssence, updateEssence, deleteEssence, deleteManyEssences, subscribeToDemands } = useFirebase();
  const [essences, setEssences] = useState([])
  const [demandsByEssence, setDemandsByEssence] = useState({}) // State to hold demands grouped by essenceId
  const [selectedEssences, setSelectedEssences] = useState([]) // Seçili esansları tutacak state
  const [confirmDeleteDialog, setConfirmDeleteDialog] = useState(false) // Toplu silme onay dialogu

  useEffect(() => {
    const unsubscribe = subscribeToEssences((updatedEssences) => {
      setEssences(updatedEssences)
    })
    return () => unsubscribe()
  }, [subscribeToEssences])

  // Subscribe to Demands and group them by essenceId
  useEffect(() => {
    const unsubscribeDemands = subscribeToDemands((allDemands) => {
      const groupedDemands = allDemands.reduce((acc, demand) => {
        const { essenceId } = demand;
        if (!acc[essenceId]) {
          acc[essenceId] = [];
        }
        // Add necessary demand details
        acc[essenceId].push({
          id: demand.id,
          userName: demand.userName || 'Bilinmeyen Kullanıcı', // Add fallback
          amount: demand.amount,
          date: demand.createdAt?.toDate ? demand.createdAt.toDate() : new Date() // Handle potential non-timestamp data
        });
        // Sort demands by date descending within each group
        acc[essenceId].sort((a, b) => b.date - a.date);
        return acc;
      }, {});
      console.log('Grouped Demands:', groupedDemands); // Debugging line
      setDemandsByEssence(groupedDemands);
    });

    return () => unsubscribeDemands();
  }, [subscribeToDemands]);

  const [openRows, setOpenRows] = useState({})
  const [openDialog, setOpenDialog] = useState(false)
  const [openSnackbar, setOpenSnackbar] = useState(false)
  const [snackbarMessage, setSnackbarMessage] = useState('')
  const [editingEssence, setEditingEssence] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    targetAmount: 250,
    stockAmount: 0,
    code: '',
    price: 0,
    category: ''
  })



  const handleOpenDialog = (essence = null) => {
    if (essence) {
      setEditingEssence(essence)
      setFormData({
        name: essence.name,
        code: essence.code,
        targetAmount: essence.targetAmount,
        stockAmount: essence.stockAmount,
        price: essence.price,
        category: essence.category || ''
      })
    } else {
      setEditingEssence(null)
      setFormData({
        name: '',
        code: '',
        targetAmount: 250,
        stockAmount: 0,
        price: 0,
        category: ''
      })
    }
    setOpenDialog(true)
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    setEditingEssence(null)
    setFormData({
      name: '',
      code: '',
      targetAmount: 250,
      stockAmount: 0,
      price: 0
    })
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async () => {
    if (!formData.code || !/^[A-Za-z0-9]+$/.test(formData.code)) {
      setSnackbarMessage('Lütfen geçerli bir kod giriniz (sadece harf ve rakam içerebilir)')
      setOpenSnackbar(true)
      return
    }

    const codeExists = essences.some(essence => 
      essence.code === formData.code && (!editingEssence || essence.id !== editingEssence.id)
    )

    if (codeExists) {
      setSnackbarMessage('Bu kod zaten kullanılmakta')
      setOpenSnackbar(true)
      return
    }

    try {
      if (editingEssence) {
        await updateEssence(editingEssence.id, formData)
        setSnackbarMessage('Esans başarıyla güncellendi')
      } else {
        await addEssence({
          ...formData,
          totalDemand: 0,
          demands: []
        })
        setSnackbarMessage('Yeni esans başarıyla eklendi')
      }
      setOpenSnackbar(true)
      handleCloseDialog()
    } catch (error) {
      setSnackbarMessage('İşlem sırasında bir hata oluştu')
      setOpenSnackbar(true)
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteEssence(id)
      setSnackbarMessage('Esans başarıyla silindi')
      setOpenSnackbar(true)
    } catch (error) {
      setSnackbarMessage('Esans silinirken bir hata oluştu')
      setOpenSnackbar(true)
    }
  }
  
  // Toplu seçme işlemleri için fonksiyonlar
  const handleSelectAll = (event) => {
    if (event.target.checked) {
      // Tüm esansları seç
      const allEssenceIds = essences.map(essence => essence.id);
      setSelectedEssences(allEssenceIds);
    } else {
      // Tüm seçimleri kaldır
      setSelectedEssences([]);
    }
  };
  
  const handleSelectEssence = (event, essenceId) => {
    if (event.target.checked) {
      // Esansı seçilenlere ekle
      setSelectedEssences(prev => [...prev, essenceId]);
    } else {
      // Esansı seçililerden çıkar
      setSelectedEssences(prev => prev.filter(id => id !== essenceId));
    }
  };
  
  const handleBulkDelete = async () => {
    if (selectedEssences.length === 0) return;
    
    try {
      // Toplu silme işlemini gerçekleştir
      const results = await deleteManyEssences(selectedEssences);
      
      // Başarılı ve başarısız işlemleri say
      const successful = results.filter(result => result.success).length;
      const failed = results.filter(result => !result.success).length;
      
      // Kullanıcıya bilgi ver
      let message = '';
      if (successful > 0 && failed === 0) {
        message = `${successful} esans başarıyla silindi.`;
      } else if (successful > 0 && failed > 0) {
        message = `${successful} esans silindi, ${failed} esans silinemedi.`;
      } else {
        message = 'Esanslar silinemedi.';
      }
      
      setSnackbarMessage(message);
      setOpenSnackbar(true);
      setSelectedEssences([]); // Seçimleri sıfırla
      setConfirmDeleteDialog(false); // Onay dialogunu kapat
    } catch (error) {
      setSnackbarMessage('Toplu silme işlemi sırasında bir hata oluştu');
      setOpenSnackbar(true);
      setConfirmDeleteDialog(false);
    }
  };
  
  const openConfirmDeleteDialog = () => {
    if (selectedEssences.length === 0) {
      setSnackbarMessage('Lütfen silinecek esansları seçin');
      setOpenSnackbar(true);
      return;
    }
    setConfirmDeleteDialog(true);
  };

  const downloadTemplate = () => {
    const template = [
      ['Esans Adı', 'Esans Kodu', 'Kategori', 'Stok Miktarı (gr)', 'Toplam Talep (gr)', 'Fiyat (TL/gr)'],
      ['Örnek Esans 1', 'ES001', 'Kategori 1', 0, 0, 0],
      ['Örnek Esans 2', 'ES002', 'Kategori 2', 0, 0, 0]
    ]
    
    const ws = XLSX.utils.aoa_to_sheet(template)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Esans Şablonu')
    XLSX.writeFile(wb, 'esans_sablonu.xlsx')
  }

  const handleFileUpload = (event) => {
    const file = event.target.files[0]
    const reader = new FileReader()

    reader.onload = async (e) => {
      const data = new Uint8Array(e.target.result)
      const workbook = XLSX.read(data, { type: 'array' })
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

      // İlk satırı (başlıkları) atla ve verileri işle
      const newEssences = jsonData.slice(1).map((row, index) => ({
        id: essences.length + index + 1,
        name: row[0],
        code: row[1] || `ES${(essences.length + index + 1).toString().padStart(3, '0')}`,
        category: row[2] || '',
        stockAmount: row[3] || 0,
        totalDemand: row[4] || 0,
        price: row[5] || 0,
        demands: []
      }))

      // Save each new essence to Firestore
      try {
        for (const essence of newEssences) {
          // Ensure essential fields are present, provide defaults if necessary
          const essenceToAdd = {
            name: essence.name || 'İsimsiz Esans',
            code: essence.code || `ES${Date.now()}${Math.floor(Math.random() * 100)}`, // Generate a unique code if missing
            category: essence.category || '',
            stockAmount: Number(essence.stockAmount) || 0,
            totalDemand: Number(essence.totalDemand) || 0,
            price: Number(essence.price) || 0,
            targetAmount: 250, // Default target amount
            demands: [] // Initialize demands array
          };
          // Validate code uniqueness before adding
          const codeExists = essences.some(existingEssence => existingEssence.code === essenceToAdd.code);
          if (codeExists) {
            console.warn(`Skipping essence with duplicate code: ${essenceToAdd.code}`);
            continue; // Skip this essence if code already exists
          }
          await addEssence(essenceToAdd);
        }
        setSnackbarMessage(`${newEssences.length} esans başarıyla içe aktarıldı ve kaydedildi`);
        setOpenSnackbar(true);
      } catch (error) {
        console.error("Error importing essences:", error);
        setSnackbarMessage('Esanslar içe aktarılırken bir hata oluştu.');
        setOpenSnackbar(true);
      }
    }

    reader.readAsArrayBuffer(file);
  }

  const toggleRow = (id) => {
    setOpenRows(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  return (
    <Box sx={{ width: '100%', height: '100%', backgroundColor: '#fff', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderBottom: '1px solid rgba(224, 224, 224, 1)' }}>
        <Typography variant="h4" component="h1">
          Esans Yönetimi
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={downloadTemplate}
            sx={{ mr: 2 }}
          >
            Şablon İndir
          </Button>
          <Button
            variant="outlined"
            component="label"
            sx={{ mr: 2 }}
          >
            Excel Yükle
            <input
              type="file"
              hidden
              accept=".xlsx, .xls"
              onChange={handleFileUpload}
            />
          </Button>
          {selectedEssences.length > 0 && (
            <Tooltip title="Seçili esansları sil">
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteSweepIcon />}
                onClick={openConfirmDeleteDialog}
                sx={{ mr: 2 }}
              >
                Seçilenleri Sil ({selectedEssences.length})
              </Button>
            </Tooltip>
          )}
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Yeni Esans Ekle
          </Button>
        </Box>
      </Box>



      <Box sx={{ mt: 4, pt: 4 }}>

        <TableContainer component={props => <Paper {...props} elevation={0} />} sx={{ backgroundColor: '#fff', marginTop: 0, marginBottom: 0 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selectedEssences.length > 0 && selectedEssences.length < essences.length}
                    checked={essences.length > 0 && selectedEssences.length === essences.length}
                    onChange={handleSelectAll}
                  />
                </TableCell>
                <TableCell padding="none" width="48px" />
                <TableCell>Esans Adı</TableCell>
                <TableCell>Esans Kodu</TableCell>
                <TableCell>Kategori</TableCell>
                <TableCell align="right">Stok Miktarı (gr)</TableCell>
                <TableCell align="right">Toplam Talep (gr)</TableCell>
                <TableCell align="right">Fiyat (TL/gr)</TableCell>
                <TableCell align="right">Durum</TableCell>
                <TableCell align="right">İşlemler</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {essences.map((essence) => {
                const isConfirmedPurchase = essence.totalDemand >= 250
                
                return (
                  <React.Fragment key={essence.id}>
                    <TableRow>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedEssences.includes(essence.id)}
                          onChange={(event) => handleSelectEssence(event, essence.id)}
                        />
                      </TableCell>
                      <TableCell padding="none">
                        <IconButton
                          size="small"
                          onClick={() => toggleRow(essence.id)}
                        >
                          {openRows[essence.id] ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                        </IconButton>
                      </TableCell>
                      <TableCell>{essence.name}</TableCell>
                      <TableCell>{essence.code}</TableCell>
                      <TableCell>{essence.category || '-'}</TableCell>
                      <TableCell align="right">{essence.stockAmount}</TableCell>
                      <TableCell align="right">{essence.totalDemand}</TableCell>
                      <TableCell align="right">{essence.price}</TableCell>
                      <TableCell align="right">
                        {isConfirmedPurchase ? (
                          <Chip
                            icon={<CheckCircleIcon />}
                            label="Kesin Alım"
                            color="warning"
                            variant="outlined"
                            sx={{
                              '& .MuiChip-icon': {
                                color: 'inherit'
                              }
                            }}
                          />
                        ) : (
                          <Chip
                            icon={<Autorenew />}
                            label="Talep Toplanıyor"
                            color="primary"
                            variant="outlined"
                            sx={{
                              '& .MuiChip-icon': {
                                color: 'inherit'
                              }
                            }}
                          />
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(essence)}
                          sx={{ mr: 1 }}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(essence.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
                        <Collapse in={openRows[essence.id]} timeout="auto" unmountOnExit>
                          <Box sx={{ margin: 1 }}>
                            <Typography variant="h6" gutterBottom component="div">
                              Talep Geçmişi
                            </Typography>
                            <Table size="small" sx={{ backgroundColor: '#fff' }}>
                              <TableHead>
                                <TableRow>
                                  <TableCell>Ad Soyad</TableCell>
                                  <TableCell>Telefon</TableCell>
                                  <TableCell align="right">Talep Miktarı (gr)</TableCell>
                                  <TableCell align="right">Birim Fiyat (TL/gr)</TableCell>
                                  {/* Toplam Tutar kolonu kaldırıldı */}
                                  <TableCell align="right">Tarih</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {/* Display demands from demandsByEssence state */}
                                {(demandsByEssence[essence.id] || []).map((demand) => {
                                  console.log(`Demands for essence ${essence.id}:`, demandsByEssence[essence.id]); // Debugging line
                                  // Removed localStorage lookup for userDetails
                                  return (
                                    <TableRow key={demand.id}>
                                      <TableCell component="th" scope="row">
                                        {demand.userName} 
                                      </TableCell>
                                      <TableCell>
                                        {/* Phone number removed as it relied on potentially unreliable localStorage lookup */}
                                        -
                                      </TableCell>
                                      <TableCell align="right">{demand.amount}</TableCell>
                                      <TableCell align="right">{essence.price}</TableCell>
                                      {/* Toplam Tutar hücresi kaldırıldı */}
                                      <TableCell align="right">
                                        {/* Ensure demand.date is a valid Date object */}
                                        {demand.date instanceof Date ? demand.date.toLocaleDateString('tr-TR') : 'Geçersiz Tarih'}
                                      </TableCell>
                                    </TableRow>
                                  )
                                })}
                              </TableBody>
                            </Table>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>
          {editingEssence ? 'Esans Düzenle' : 'Yeni Esans Ekle'}
        </DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            name="name"
            label="Esans Adı"
            type="text"
            fullWidth
            value={formData.name}
            onChange={handleInputChange}
          />
          <TextField
            margin="dense"
            name="code"
            label="Esans Kodu"
            type="text"
            fullWidth
            value={formData.code}
            onChange={handleInputChange}
            helperText="Sadece harf ve rakam içerebilir"
          />
          <TextField
            margin="dense"
            name="stockAmount"
            label="Stok Miktarı (gr)"
            type="number"
            fullWidth
            value={formData.stockAmount}
            onChange={handleInputChange}
          />
          <TextField
            margin="dense"
            name="price"
            label="Fiyat (TL/gr)"
            type="number"
            fullWidth
            value={formData.price}
            onChange={handleInputChange}
          />
          <TextField
            margin="dense"
            name="category"
            label="Kategori"
            type="text"
            fullWidth
            value={formData.category}
            onChange={handleInputChange}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>İptal</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingEssence ? 'Güncelle' : 'Ekle'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={openSnackbar}
        autoHideDuration={3000}
        onClose={() => setOpenSnackbar(false)}
      >
        <MuiAlert
          elevation={6}
          variant="filled"
          severity="success"
          onClose={() => setOpenSnackbar(false)}>
          {snackbarMessage}
        </MuiAlert>
      </Snackbar>
      
      {/* Toplu silme onay dialogu */}
      <Dialog
        open={confirmDeleteDialog}
        onClose={() => setConfirmDeleteDialog(false)}
      >
        <DialogTitle>Toplu Silme Onayı</DialogTitle>
        <DialogContent>
          <Typography>
            Seçili {selectedEssences.length} esansı ve bunlara ait tüm talepleri silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteDialog(false)}>Vazgeç</Button>
          <Button onClick={handleBulkDelete} color="error" variant="contained">
            Sil
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default AdminPage
