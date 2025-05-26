import { useState, useEffect } from 'react'
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  LinearProgress
} from '@mui/material'
import {
  BarChart,
  LineChart,
  PieChart
} from '@mui/x-charts'
import { useTheme } from '@mui/material/styles'

function Dashboard() {
  const theme = useTheme()
  const [essences, setEssences] = useState([])
  const [demands, setDemands] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const savedEssences = JSON.parse(localStorage.getItem('essences') || '[]')
    const savedDemands = JSON.parse(localStorage.getItem('demands') || '[]')
    
    // Her esans için toplam talep miktarını hesapla
    const essencesWithTotalDemand = savedEssences.map(essence => ({
      ...essence,
      totalDemand: savedDemands
        .filter(demand => demand.essenceId === essence.id)
        .reduce((sum, demand) => sum + Number(demand.amount), 0)
    }))

    setEssences(essencesWithTotalDemand)
    setDemands(savedDemands)
    setLoading(false)
  }, [])

  const totalDemand = essences.reduce((sum, essence) => sum + essence.totalDemand, 0)
  const totalStock = essences.reduce((sum, essence) => sum + Number(essence.stockAmount), 0)
  const confirmedPurchases = demands.filter(demand => demand.status === 'Onaylandı').length

  // En çok talep edilen 5 esansı göster
  const barChartData = [...essences]
    .sort((a, b) => b.totalDemand - a.totalDemand)
    .slice(0, 5)
    .map(essence => ({
      name: essence.name,
      'Toplam Talep': essence.totalDemand,
      'Stok Miktarı': Number(essence.stockAmount)
    }))

  const pieChartData = essences
    .filter(essence => essence.totalDemand > 0)
    .map(essence => ({
      id: essence.id,
      value: essence.totalDemand,
      label: essence.name
    }))

  const lineChartData = {
    xAxis: [{ data: essences.map(essence => essence.name) }],
    series: [
      {
        data: essences.map(essence => essence.totalDemand),
        label: 'Toplam Talep'
      },
      {
        data: essences.map(essence => Number(essence.stockAmount)),
        label: 'Stok Miktarı'
      }
    ]
  }

  if (loading) {
    return (
      <Box sx={{ width: '100%', mt: 4 }}>
        <LinearProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ width: '100%', height: '100%', p: 3 }}>
      <Grid container spacing={3}>
        {/* İstatistik Kartları */}
        <Grid item xs={12} sm={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Toplam Talep
              </Typography>
              <Typography variant="h4" component="div">
                {totalDemand} gr
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Toplam Stok
              </Typography>
              <Typography variant="h4" component="div">
                {totalStock} gr
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Onaylanan Talepler
              </Typography>
              <Typography variant="h4" component="div">
                {confirmedPurchases}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Grafikler */}
        <Grid item xs={12} md={8}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              height: 400,
            }}
          >
            <Typography variant="h6" gutterBottom component="div">
              En Çok Talep Edilen Esanslar
            </Typography>
            <Box sx={{ flexGrow: 1, width: '100%' }}>
              <BarChart
                dataset={barChartData}
                xAxis={[{ scaleType: 'band', dataKey: 'name' }]}
                series={[
                  { dataKey: 'Toplam Talep', label: 'Toplam Talep' },
                  { dataKey: 'Stok Miktarı', label: 'Stok Miktarı' }
                ]}
                height={300}
              />
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              height: 400,
            }}
          >
            <Typography variant="h6" gutterBottom component="div">
              Talep Dağılımı
            </Typography>
            <Box sx={{ flexGrow: 1, width: '100%' }}>
              <PieChart
                series={[{
                  data: pieChartData,
                  highlightScope: { faded: 'global', highlighted: 'item' },
                  faded: { innerRadius: 30, additionalRadius: -30 },
                }]}
                height={300}
              />
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              height: 400,
            }}
          >
            <Typography variant="h6" gutterBottom component="div">
              Talep ve Stok Trendi
            </Typography>
            <Box sx={{ flexGrow: 1, width: '100%' }}>
              <LineChart
                xAxis={lineChartData.xAxis}
                series={lineChartData.series}
                height={300}
              />
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}

export default Dashboard