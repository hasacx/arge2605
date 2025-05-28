import React, { useState, useEffect } from 'react'; import { useNavigate } from 'react-router-dom'; import { useFirebase } from '../firebase/FirebaseContext'; import { Box, Button, Checkbox, Chip, Container, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Paper, Snackbar, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography } from '@mui/material'; import MuiAlert from '@mui/material/Alert'; import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Download as DownloadIcon, CheckCircle as CheckCircleIcon, KeyboardArrowDown as KeyboardArrowDownIcon, KeyboardArrowUp as KeyboardArrowUpIcon, Autorenew, DeleteSweep as DeleteSweepIcon } from '@mui/icons-material'; import * as XLSX from 'xlsx';

function AdminPage() { const navigate = useNavigate(); const { currentUser, loading, subscribeToEssences, addEssence, updateEssence, deleteEssence, deleteManyEssences, subscribeToDemands } = useFirebase(); const [essences, setEssences] = useState([]); const [demandsByEssence, setDemandsByEssence] = useState({}); const [selectedEssences, setSelectedEssences] = useState([]); const [confirmDeleteDialog, setConfirmDeleteDialog] = useState(false); const [openRows, setOpenRows] = useState({}); const [openDialog, setOpenDialog] = useState(false); const [openSnackbar, setOpenSnackbar] = useState(false); const [snackbarMessage, setSnackbarMessage] = useState(''); const [editingEssence, setEditingEssence] = useState(null); const [formData, setFormData] = useState({ name: '', targetAmount: 250, stockAmount: 0, code: '', price: 0, category: '' });

useEffect(() => { if (!loading) { if (!currentUser || currentUser.role !== 'admin') { navigate('/'); } } }, [currentUser, loading, navigate]);

if (loading) return <Typography>Loading admin data...</Typography>; if (!currentUser || currentUser.role !== 'admin') return null;

useEffect(() => { const unsubscribe = subscribeToEssences(setEssences); return () => unsubscribe(); }, [subscribeToEssences]);

useEffect(() => { const unsubscribeDemands = subscribeToDemands((allDemands) => { const grouped = allDemands.reduce((acc, d) => { const { essenceId } = d; if (!acc[essenceId]) acc[essenceId] = []; acc[essenceId].push({ id: d.id, userName: d.userName || 'Bilinmeyen Kullanıcı', amount: d.amount, date: d.createdAt?.toDate ? d.createdAt.toDate() : new Date() }); acc[essenceId].sort((a, b) => b.date - a.date); return acc; }, {}); setDemandsByEssence(grouped); }); return () => unsubscribeDemands(); }, [subscribeToDemands]);

const handleOpenDialog = (essence = null) => { setEditingEssence(essence); setFormData(essence ? { ...essence } : { name: '', code: '', targetAmount: 250, stockAmount: 0, price: 0, category: '' }); setOpenDialog(true); };

const handleCloseDialog = () => { setOpenDialog(false); setEditingEssence(null); setFormData({ name: '', code: '', targetAmount: 250, stockAmount: 0, price: 0, category: '' }); };

const handleInputChange = (e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); };

const handleSubmit = async () => { if (!formData.code || !/^[A-Za-z0-9]+$/.test(formData.code)) { setSnackbarMessage('Lütfen geçerli bir kod giriniz.'); setOpenSnackbar(true); return; } const codeExists = essences.some(e => e.code === formData.code && (!editingEssence || e.id !== editingEssence.id)); if (codeExists) { setSnackbarMessage('Bu kod zaten kullanılmakta'); setOpenSnackbar(true); return; } try { if (editingEssence) { await updateEssence(editingEssence.id, formData); setSnackbarMessage('Esans güncellendi'); } else { await addEssence({ ...formData, totalDemand: 0, demands: [] }); setSnackbarMessage('Yeni esans eklendi'); } setOpenSnackbar(true); handleCloseDialog(); } catch { setSnackbarMessage('Hata oluştu'); setOpenSnackbar(true); } };

const handleDelete = async (id) => { try { await deleteEssence(id); setSnackbarMessage('Esans silindi'); } catch { setSnackbarMessage('Silme hatası'); } setOpenSnackbar(true); };

const handleSelectAll = (e) => { setSelectedEssences(e.target.checked ? essences.map(e => e.id) : []); };

const handleSelectEssence = (e, id) => { setSelectedEssences(prev => e.target.checked ? [...prev, id] : prev.filter(i => i !== id)); };

const handleBulkDelete = async () => { try { const results = await deleteManyEssences(selectedEssences); const successCount = results.filter(r => r.success).length; const failCount = results.length - successCount; setSnackbarMessage(${successCount} silindi, ${failCount} silinemedi.); setSelectedEssences([]); setConfirmDeleteDialog(false); } catch { setSnackbarMessage('Toplu silme hatası'); setConfirmDeleteDialog(false); } setOpenSnackbar(true); };

const downloadTemplate = () => { const template = [['Esans Adı', 'Esans Kodu', 'Kategori', 'Stok Miktarı', 'Toplam Talep', 'Fiyat'], ['Örnek', 'ES001', 'Kategori', 0, 0, 0]]; const ws = XLSX.utils.aoa_to_sheet(template); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Şablon'); XLSX.writeFile(wb, 'esans_sablonu.xlsx'); };

const handleFileUpload = (e) => { const file = e.target.files[0]; const reader = new FileReader(); reader.onload = async (ev) => { const data = new Uint8Array(ev.target.result); const wb = XLSX.read(data, { type: 'array' }); const ws = wb.Sheets[wb.SheetNames[0]]; const json = XLSX.utils.sheet_to_json(ws, { header: 1 }); const entries = json.slice(1).map((row, i) => ({ id: essences.length + i + 1, name: row[0], code: row[1] || ES${essences.length + i + 1}, category: row[2] || '', stockAmount: row[3] || 0, totalDemand: row[4] || 0, price: row[5] || 0, targetAmount: 250, demands: [] }));

try {
    for (const e of entries) {
      if (!essences.some(x => x.code === e.code)) await addEssence(e);
    }
    setSnackbarMessage(`${entries.length} esans içe aktarıldı`);
  } catch {
    setSnackbarMessage('İçe aktarma hatası');
  }
  setOpenSnackbar(true);
};
reader.readAsArrayBuffer(file);

};

const toggleRow = (id) => { setOpenRows(prev => ({ ...prev, [id]: !prev[id] })); };

return ( <Box> {/* Admin arayüzü bileşenleri burada /} <Typography variant="h4" sx={{ my: 2 }}>Admin Paneli</Typography> {/ Geliştirilecek: Esans listesi tablosu, butonlar, dialog formlar vs. */} </Box> ); }

export default AdminPage;

