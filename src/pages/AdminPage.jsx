import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFirebase } from '../firebase/FirebaseContext'
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
  Checkbox,
  Tooltip,
  IconButton,
  Collapse,
  Chip
} from '@mui/material'
import MuiAlert from '@mui/material/Alert'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon
} from '@mui/icons-material'
import * as XLSX from 'xlsx'

const Alert = React.forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />
})

export default function AdminPage() {
  const navigate = useNavigate()
  const { currentUser, loading } = useFirebase()

  const {
    subscribeToEssences,
    addEssence,
    updateEssence,
    deleteEssence,
    deleteManyEssences,
    subscribeToDemands
  } = useFirebase()

  const [essences, setEssences] = useState([])
  const [demandsByEssence, setDemandsByEssence] = useState({})
  const [selectedEssences, setSelectedEssences] = useState([])
  const [confirmDeleteDialog, setConfirmDeleteDialog] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
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

  useEffect(() => {
    if (!loading) {
      if (!currentUser) {
        navigate('/')
      } else if (currentUser.role !== 'admin') {
        navigate('/')
      }
    }
  }, [currentUser, loading, navigate])

  useEffect(() => {
    const unsubscribe = subscribeToEssences((updatedEssences) => {
      setEssences(updatedEssences)
    })
    return () => unsubscribe()
  }, [subscribeToEssences])

  useEffect(() => {
    const unsubscribeDemands = subscribeToDemands((allDemands) => {
      const groupedDemands = allDemands.reduce((acc, demand) => {
        const { essenceId } = demand
        if (!acc[essenceId]) {
          acc[essenceId] = []
        }
        acc[essenceId].push({
          id: demand.id,
          userName: demand.userName || 'Bilinmeyen Kullanıcı',
          amount: demand.amount,
          date: demand.createdAt?.toDate ? demand.createdAt.toDate() : new Date()
        })
        acc[essenceId].sort((a, b) => b.date - a.date)
        return acc
      }, {})
      setDemandsByEssence(groupedDemands)
    })

    return () => unsubscribeDemands()
  }, [subscribeToDemands])

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
      price: 0,
      category: ''
    })
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
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

    const codeExists = essences.some(
      (essence) =>
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

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      const allEssenceIds = essences.map((essence) => essence.id)
      setSelectedEssences(allEssenceIds)
    } else {
      setSelectedEssences([])
    }
  }

  const handleSelectEssence = (event, essenceId) => {
    if (event.target.checked) {
      setSelectedEssences((prev) => [...prev, essenceId])
    } else {
      setSelectedEssences((prev) => prev.filter((id) => id !== essenceId))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedEssences.length === 0) return

    try {
      const results = await deleteManyEssences(selectedEssences)
      const successful = results.filter((result) => result.success).length
      const failed = results.filter((result) => !result.success).length

      let message = ''
      if (successful > 0 && failed === 0) {
        message = `${successful} esans başarıyla silindi.`
      } else if (successful > 0 && failed > 0) {
        message = `${successful} esans silindi, ${failed} esans silinemedi.`
      } else {
        message = 'Esanslar silinemedi.'
      }

      setSnackbarMessage(message)
      setOpenSnackbar(true)
      setSelectedEssences([])
      setConfirmDeleteDialog(false)
    } catch (error) {
      setSnackbarMessage('Toplu silme işlemi sırasında bir hata oluştu')
      setOpenSnackbar(true)
      setConfirmDeleteDialog(false)
    }
  }

  const openConfirmDeleteDialog = () => {
    if (selectedEssences.length === 0) {
      setSnackbarMessage('Lütfen silinecek esansları seçin')
      setOpenSnackbar(true)
      return
    }
    setConfirmDeleteDialog(true)
  }

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
    if (!file) {
      setSnackbarMessage('Dosya seçilmedi.')
      setOpenSnackbar(true)
      return;
    }

    const reader = new FileReader()

    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        const worksheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

        const newEssences = jsonData.slice(1).map((row) => ({
          name: row[0] || 'İsimsiz Esans',
          code: String(row[1] || '').trim(),
          category: row[2] || '',
          stockAmount: Number(row[3]) || 0,
          totalDemand: Number(row[4]) || 0,
          price: Number(row[5]) || 0,
          targetAmount: 250,
          demands: []
        }))

        let addedCount = 0;
        let skippedCount = 0;

        for (const essence of newEssences) {
          if (!essence.code || !/^[A-Za-z0-9]+$/.test(essence.code)) {
            console.warn(`Geçersiz veya boş kod nedeniyle atlandı: ${essence.name || 'Bilinmeyen Esans'}`);
            skippedCount++;
            continue;
          }

          const codeExists = essences.some(existingEssence => existingEssence.code === essence.code);
          if (codeExists) {
            console.warn(`Bu kod zaten kullanılmakta, esans atlandı: ${essence.code}`);
            skippedCount++;
            continue;
          }
          
          await addEssence(essence);
          addedCount++;
        }

        if (addedCount > 0 && skippedCount === 0) {
          setSnackbarMessage(`${addedCount} esans başarıyla içe aktarıldı.`);
        } else if (addedCount > 0 && skippedCount > 0) {
          setSnackbarMessage(`${addedCount} esans içe aktarıldı, ${skippedCount} esans atlandı (geçersiz/tekrar eden kod nedeniyle).`);
        } else if (addedCount === 0 && skippedCount > 0) {
            setSnackbarMessage(`Tüm esanslar geçersiz/tekrar eden kod nedeniyle atlandı.`);
        } else {
            setSnackbarMessage('Excel dosyasında içe aktarılacak geçerli esans bulunamadı.');
        }
        setOpenSnackbar(true);

      } catch (error) {
        console.error("Error importing essences from Excel:", error);
        setSnackbarMessage('Esanslar içe aktarılırken bir hata oluştu: ' + error.message);
        setOpenSnackbar(true);
      }
    }

    reader.onerror = () => {
        setSnackbarMessage('Dosya okuma hatası.');
        setOpenSnackbar(true);
    };

    reader.readAsArrayBuffer(file);
  }

  const filteredEssences = essences.filter((essence) => {
    const lowerSearch = searchTerm.toLowerCase()
    return (
      essence.name.toLowerCase().includes(lowerSearch) ||
      essence.code.toLowerCase().includes(lowerSearch) ||
      (essence.category && essence.category.toLowerCase().includes(lowerSearch))
    )
  })

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Esans Yönetimi
      </Typography>

      <TextField
        label="Esans Ara"
        variant="outlined"
        fullWidth
        margin="normal"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Yeni Esans Ekle
        </Button>

        <Box>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<DeleteIcon />}
            onClick={openConfirmDeleteDialog}
            disabled={selectedEssences.length === 0}
            sx={{ mr: 2 }}
          >
            Seçilenleri Sil ({selectedEssences.length})
          </Button>

          <Button
            variant="outlined"
            color="info"
            startIcon={<DownloadIcon />}
            onClick={downloadTemplate}
            sx={{ mr: 2 }}
          >
            Şablon İndir
          </Button>

          <Button
            variant="contained"
            component="label"
            color="success"
            startIcon={<DownloadIcon style={{ transform: 'rotate(180deg)' }} />}
          >
            Excel Yükle
            <input
              type="file"
              hidden
              accept=".xlsx, .xls"
              onChange={handleFileUpload}
              onClick={(event) => { event.target.value = null }}
            />
          </Button>
        </Box>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={
                    selectedEssences.length > 0 &&
                    selectedEssences.length === essences.length
                  }
                  indeterminate={
                    selectedEssences.length > 0 &&
                    selectedEssences.length < essences.length
                  }
                  onChange={handleSelectAll}
                  inputProps={{ 'aria-label': 'select all essences' }}
                />
              </TableCell>
              <TableCell />
              <TableCell>Esans Kodu</TableCell>
              <TableCell>Esans Adı</TableCell>
              <TableCell>Kategori</TableCell>
              <TableCell>Hedef Miktar (gr)</TableCell>
              <TableCell>Stok Miktarı (gr)</TableCell>
              <TableCell>Fiyat (TL/gr)</TableCell>
              <TableCell>İşlemler</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredEssences.map((essence) => {
              const demands = demandsByEssence[essence.id] || []
              const totalDemandAmount = demands.reduce(
                (sum, d) => sum + (Number(d.amount) || 0),
                0
              )
              const isOpen = openRows[essence.id] || false
              return (
                <React.Fragment key={essence.id}>
                  <TableRow hover>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedEssences.includes(essence.id)}
                        onChange={(e) => handleSelectEssence(e, essence.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() =>
                          setOpenRows((prev) => ({
                            ...prev,
                            [essence.id]: !isOpen
                          }))
                        }
                      >
                        {isOpen ? (
                          <KeyboardArrowUpIcon />
                        ) : (
                          <KeyboardArrowDownIcon />
                        )}
                      </IconButton>
                    </TableCell>
                    <TableCell>{essence.code}</TableCell>
                    <TableCell>{essence.name}</TableCell>
                    <TableCell>{essence.category}</TableCell>
                    <TableCell>{essence.targetAmount}</TableCell>
                    <TableCell>{essence.stockAmount}</TableCell>
                    <TableCell>{essence.price}</TableCell>
                    <TableCell>
                      <Tooltip title="Düzenle">
                        <IconButton
                          color="primary"
                          onClick={() => handleOpenDialog(essence)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Sil">
                        <IconButton
                          color="error"
                          onClick={() => handleDelete(essence.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell
                      style={{ paddingBottom: 0, paddingTop: 0 }}
                      colSpan={9}
                    >
                      <Collapse in={isOpen} timeout="auto" unmountOnExit>
                        <Box margin={2}>
                          <Typography variant="subtitle1" gutterBottom>
                            Talepler
                          </Typography>
                          {demands.length === 0 ? (
                            <Typography variant="body2" color="text.secondary">
                              Bu esans için henüz talep yok.
                            </Typography>
                          ) : (
                            <Table size="small" aria-label="demands">
                              <TableHead>
                                <TableRow>
                                  <TableCell>Kullanıcı</TableCell>
                                  <TableCell>Miktar (gr)</TableCell>
                                  <TableCell>Tarih</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {demands.map((demand) => (
                                  <TableRow key={demand.id}>
                                    <TableCell>{demand.userName}</TableCell>
                                    <TableCell>{demand.amount}</TableCell>
                                    <TableCell>
                                      {demand.date.toLocaleDateString()}{' '}
                                      {demand.date.toLocaleTimeString()}
                                    </TableCell>
                                  </TableRow>
                                ))}
                                <TableRow>
                                  <TableCell>
                                    <b>Toplam Talep</b>
                                  </TableCell>
                                  <TableCell>
                                    <b>{totalDemandAmount}</b>
                                  </TableCell>
                                  <TableCell />
                                </TableRow>
                              </TableBody>
                            </Table>
                          )}
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

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingEssence ? 'Esans Düzenle' : 'Yeni Esans Ekle'}</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            label="Esans Adı"
            name="name"
            fullWidth
            variant="outlined"
            value={formData.name}
            onChange={handleInputChange}
          />
          <TextField
            margin="dense"
            label="Esans Kodu"
            name="code"
            fullWidth
            variant="outlined"
            value={formData.code}
            onChange={handleInputChange}
            helperText="Sadece harf ve rakam kullanılabilir"
          />
          <TextField
            margin="dense"
            label="Kategori"
            name="category"
            fullWidth
            variant="outlined"
            value={formData.category}
            onChange={handleInputChange}
          />
          <TextField
            margin="dense"
            label="Hedef Miktar (gr)"
            name="targetAmount"
            type="number"
            fullWidth
            variant="outlined"
            value={formData.targetAmount}
            onChange={handleInputChange}
            inputProps={{ min: 0 }}
          />
          <TextField
            margin="dense"
            label="Stok Miktarı (gr)"
            name="stockAmount"
            type="number"
            fullWidth
            variant="outlined"
            value={formData.stockAmount}
            onChange={handleInputChange}
            inputProps={{ min: 0 }}
          />
          <TextField
            margin="dense"
            label="Fiyat (TL/gr)"
            name="price"
            type="number"
            fullWidth
            variant="outlined"
            value={formData.price}
            onChange={handleInputChange}
            inputProps={{ min: 0, step: 0.01 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>İptal</Button>
          <Button variant="contained" onClick={handleSubmit}>
            {editingEssence ? 'Güncelle' : 'Ekle'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={confirmDeleteDialog}
        onClose={() => setConfirmDeleteDialog(false)}
      >
        <DialogTitle>Seçilen esansları silmek istediğinize emin misiniz?</DialogTitle>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteDialog(false)}>İptal</Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleBulkDelete}
          >
            Sil
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={openSnackbar}
        autoHideDuration={4000}
        onClose={() => setOpenSnackbar(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setOpenSnackbar(false)} severity="info" sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  )
}
