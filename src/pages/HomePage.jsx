import React from 'react' import { useState, useEffect, useMemo } from 'react' import { useFirebase } from '../firebase/FirebaseContext' import { Box, Container, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Snackbar, Chip, Collapse, IconButton, TextField, Select, MenuItem, FormControl, InputLabel, LinearProgress, ButtonGroup, Tooltip } from '@mui/material' import MuiAlert from '@mui/material/Alert' import { CheckCircle as CheckCircleIcon, Autorenew, KeyboardArrowDown as KeyboardArrowDownIcon, KeyboardArrowUp as KeyboardArrowUpIcon, Add as AddIcon, Remove as RemoveIcon } from '@mui/icons-material' import { useTheme, useMediaQuery } from '@mui/material' import { Grid } from '@mui/material'

function HomePage() { const { subscribeToEssences, addDemand, subscribeToDemands, currentUser } = useFirebase() const [essences, setEssences] = useState([]) const [demandsByEssence, setDemandsByEssence] = useState({}) const theme = useTheme() const isMobile = useMediaQuery(theme.breakpoints.down('sm')) const [openRows, setOpenRows] = useState({}) const [openSnackbar, setOpenSnackbar] = useState(false) const [snackbarMessage, setSnackbarMessage] = useState('') const [snackbarSeverity, setSnackbarSeverity] = useState('success') const [demandQuantities, setDemandQuantities] = useState({}) const [searchTerm, setSearchTerm] = useState('') const [activeFilter, setActiveFilter] = useState('all') const [selectedCategory, setSelectedCategory] = useState('all')

useEffect(() => { const unsubscribe = subscribeToEssences((updatedEssences) => { setEssences(updatedEssences) }) return () => unsubscribe() }, [subscribeToEssences])

useEffect(() => { const unsubscribeDemands = subscribeToDemands((allDemands) => { const groupedDemands = allDemands.reduce((acc, demand) => { const { essenceId } = demand; if (!acc[essenceId]) { acc[essenceId] = [] } acc[essenceId].push({ id: demand.id, userName: demand.userName || 'Bilinmeyen Kullanıcı', amount: demand.amount, date: demand.createdAt?.toDate ? demand.createdAt.toDate() : new Date() }) acc[essenceId].sort((a, b) => b.date - a.date) return acc }, {}) setDemandsByEssence(groupedDemands) }) return () => unsubscribeDemands() }, [subscribeToDemands])

useEffect(() => { const initialDemandQuantities = {} essences.forEach(essence => { initialDemandQuantities[essence.id] = initialDemandQuantities[essence.id] || 1 }) setDemandQuantities(initialDemandQuantities) }, [essences])

const increaseDemandQuantity = (essenceId) => { setDemandQuantities(prev => ({ ...prev, [essenceId]: Math.min((prev[essenceId] || 1) + 1, 5) })) }

const decreaseDemandQuantity = (essenceId) => { setDemandQuantities(prev => ({ ...prev, [essenceId]: Math.max((prev[essenceId] || 1) - 1, 1) })) }

const handleCreateDemand = async (essence) => { const quantity = demandQuantities[essence.id] || 1 const amount = quantity * 50 try { if (essence.stockAmount < amount || essence.totalDemand + amount > essence.stockAmount) { setSnackbarMessage('Stok miktarı yetersiz') setSnackbarSeverity('error') setOpenSnackbar(true) return } for (let i = 0; i < quantity; i++) { await addDemand(essence.id, { amount: 50, totalPrice: 50 * essence.price, category: essence.category }) } setSnackbarMessage(${quantity} adet (${amount} gram) talep başarıyla oluşturuldu) setSnackbarSeverity('success') } catch (error) { setSnackbarMessage(error.message || 'Talep oluşturulurken bilinmeyen bir hata oluştu.') setSnackbarSeverity('error') } setOpenSnackbar(true) }

const toggleRow = (id) => { setOpenRows(prev => ({ ...prev, [id]: !prev[id] })) }

const categories = [...new Set(essences.map(essence => essence.category))].filter(Boolean)

const userDemandedEssenceIds = useMemo(() => { if (!currentUser) return [] const essenceIds = [] Object.entries(demandsByEssence).forEach(([essenceId, demands]) => { const hasUserDemand = demands.some(demand => demand.userId === currentUser.uid || demand.userName === ${currentUser.firstName} ${currentUser.lastName} ) if (hasUserDemand) { essenceIds.push(essenceId) } }) return essenceIds }, [currentUser, demandsByEssence])

const filteredEssences = essences .filter(essence => { const matchesSearch = essence.name.toLowerCase().includes(searchTerm.toLowerCase()) || essence.code.toLowerCase().includes(searchTerm.toLowerCase()) const matchesCategory = selectedCategory === 'all' || essence.category === selectedCategory const isUserDemanded = userDemandedEssenceIds.includes(essence.id) switch (activeFilter) { case 'confirmed': return matchesSearch && matchesCategory && essence.totalDemand >= 250 case 'under250': return matchesSearch && matchesCategory && essence.totalDemand < 250 case 'outOfStock': return matchesSearch && matchesCategory && essence.stockAmount === essence.totalDemand case 'myDemands': return matchesSearch && matchesCategory && isUserDemanded default: return matchesSearch && matchesCategory } }) .sort((a, b) => b.totalDemand - a.totalDemand) // Azalan gramaja göre sıralama

return ( <Box sx={{ p: 2 }}> {/* Uygulama içeriği buraya /} {/ filteredEssences listesini kullanarak UI render edilir */} </Box> ) }

export default HomePage

