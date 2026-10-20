import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert, AppBar, Box, Button, Card, CardActionArea, CardMedia, CardContent, Chip, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, IconButton, List, ListItem, ListItemText, MenuItem, Slider, Snackbar,
  Stack, Switch, FormControlLabel, Tab, Tabs, TextField, Toolbar, Tooltip, Typography,
} from '@mui/material'
import DownloadIcon from '@mui/icons-material/Download'
import SaveIcon from '@mui/icons-material/Save'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate'
import DeleteIcon from '@mui/icons-material/Delete'
import FlipIcon from '@mui/icons-material/Flip'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import UploadIcon from '@mui/icons-material/Upload'
import { api } from './api'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import { CircularProgress } from '@mui/material'
import { fetchBlob, flattenOnWhite, loadImage, removeWhiteBackground } from './imageUtils'
import TryOnCanvas, { STAGE_W, STAGE_H } from './components/TryOnCanvas'

const CATEGORIES = ['top', 'bottom', 'dress', 'outerwear', 'accessory']
const FIT = 0.85
const TRYON_CATEGORY = { top: 'upper_body', outerwear: 'upper_body', bottom: 'lower_body', dress: 'dresses' }
let nextId = 1

export default function App() {
  const [mannequins, setMannequins] = useState([])
  const [garments, setGarments] = useState([])
  const [designs, setDesigns] = useState([])
  const [modelSrc, setModelSrc] = useState('/models/european.svg')
  const [rendering, setRendering] = useState(false)
  const [renderResult, setRenderResult] = useState(null)
  const [layers, setLayers] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [category, setCategory] = useState('all')
  const [tab, setTab] = useState(0)
  const [toast, setToast] = useState(null)
  const [addOpen, setAddOpen] = useState(false)
  const [looksOpen, setLooksOpen] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)
  const stageRef = useRef()
  const photoInput = useRef()

  const notify = (message, severity = 'info') => setToast({ message, severity })
  const fail = (err) => notify(err.message, 'error')

  const refreshGarments = useCallback(() => api.garments().then(setGarments).catch(fail), [])
  useEffect(() => {
    api.mannequins().then(setMannequins).catch(fail)
    refreshGarments()
  }, [refreshGarments])

  const selected = layers.find((l) => l.id === selectedId)
  const updateLayer = (id, patch) => setLayers((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)))

  async function addGarment(g) {
    try {
      const img = await loadImage(g.imageUrl)
      const width = 300
      const height = (img.naturalHeight / img.naturalWidth) * width
      const id = nextId++
      setLayers((ls) => [...ls, {
        id, garmentId: g.id ?? null, name: g.name, category: g.category, src: g.imageUrl, width, height,
        x: STAGE_W / 2, y: STAGE_H * (g.category === 'bottom' ? 0.6 : 0.33),
        scaleX: 1, scaleY: 1, rotation: 0, opacity: 1,
      }])
      setSelectedId(id)
    } catch (err) { fail(err) }
  }

  function moveLayer(id, dir) {
    setLayers((ls) => {
      const i = ls.findIndex((l) => l.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= ls.length) return ls
      const copy = [...ls]
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
      return copy
    })
  }

  function onPhoto(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) setModelSrc(URL.createObjectURL(file))
  }

  const tryOnCategory = selected && TRYON_CATEGORY[selected.category]
  const isIllustration = modelSrc.endsWith('.svg')
  const realisticBlocker = isIllustration
    ? 'Realistic preview needs a photo model. Upload "My photo" or replace the illustrated models.'
    : !selected ? 'Select a garment layer first.'
      : !tryOnCategory ? 'This garment type is not supported by the try-on model.' : ''

  async function renderRealistic() {
    setRendering(true)
    try {
      const [person, garment] = await Promise.all([fetchBlob(modelSrc), flattenOnWhite(selected.src)])
      const blob = await api.tryOn({ category: tryOnCategory, person, garment })
      setRenderResult(URL.createObjectURL(blob))
    } catch (err) { fail(err) } finally { setRendering(false) }
  }

  function exportPng() {
    setSelectedId(null)
    requestAnimationFrame(() => {
      const url = stageRef.current.toDataURL({ pixelRatio: 2 / FIT })
      const a = document.createElement('a')
      a.href = url
      a.download = 'my-look.png'
      a.click()
    })
  }

  async function saveLook(name) {
    try {
      const modelUrl = modelSrc.startsWith('blob:') ? null : modelSrc
      if (!modelUrl) return notify('Pick one of the built-in models to save a look (your own photo is not stored).', 'warning')
      await api.createDesign({ name, mannequinUrl: modelUrl, layers: layers.map(({ id, ...rest }) => rest) })
      setSaveOpen(false)
      notify('Look saved', 'success')
    } catch (err) { fail(err) }
  }

  async function openLooks() {
    try { setDesigns(await api.designs()); setLooksOpen(true) } catch (err) { fail(err) }
  }

  function loadLook(d) {
    setModelSrc(d.mannequinUrl)
    setLayers((d.layers || []).map((l) => ({ ...l, id: nextId++ })))
    setSelectedId(null)
    setLooksOpen(false)
  }

  const visible = useMemo(
    () => garments.filter((g) => category === 'all' || g.category === category),
    [garments, category],
  )

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <AppBar position="static" color="primary" elevation={0}>
        <Toolbar sx={{ gap: 1 }}>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>Virtual Fitting Room</Typography>
          <Button color="inherit" startIcon={<FolderOpenIcon />} onClick={openLooks}>My looks</Button>
          <Button color="inherit" startIcon={<SaveIcon />} onClick={() => setSaveOpen(true)} disabled={!layers.length}>Save</Button>
          <Tooltip title={realisticBlocker}>
            <span>
              <Button color="inherit" variant="outlined" startIcon={rendering ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon />}
                disabled={!!realisticBlocker || rendering} onClick={renderRealistic}>
                {rendering ? 'Rendering…' : 'Realistic preview'}
              </Button>
            </span>
          </Tooltip>
          <Button variant="contained" color="secondary" startIcon={<DownloadIcon />} onClick={exportPng}>Download</Button>
        </Toolbar>
      </AppBar>

      <Box sx={{ display: 'grid', gap: 2, p: 2, gridTemplateColumns: { xs: '1fr', md: '320px auto 300px' }, justifyContent: 'center' }}>
        {/* Left: models + catalog */}
        <Stack spacing={2}>
          <Typography variant="subtitle1" fontWeight={700}>1. Choose a model</Typography>
          <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 1 }}>
            {mannequins.map((m) => (
              <Card key={m.id} variant="outlined" sx={{ minWidth: 72, borderColor: modelSrc === m.imageUrl ? 'secondary.main' : undefined, borderWidth: modelSrc === m.imageUrl ? 2 : 1 }}>
                <CardActionArea onClick={() => setModelSrc(m.imageUrl)}>
                  <CardMedia component="img" image={m.imageUrl} sx={{ height: 90, objectFit: 'cover', objectPosition: 'top' }} />
                  <Typography variant="caption" align="center" display="block">{m.name}</Typography>
                </CardActionArea>
              </Card>
            ))}
            <Card variant="outlined" sx={{ minWidth: 72 }}>
              <CardActionArea sx={{ height: '100%', display: 'grid', placeItems: 'center' }} onClick={() => photoInput.current.click()}>
                <AddPhotoAlternateIcon />
                <Typography variant="caption">My photo</Typography>
              </CardActionArea>
            </Card>
            <input ref={photoInput} type="file" accept="image/*" hidden onChange={onPhoto} />
          </Stack>

          <Typography variant="subtitle1" fontWeight={700}>2. Pick clothes</Typography>
          <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', rowGap: 0.5 }}>
            {['all', ...CATEGORIES].map((c) => (
              <Chip key={c} label={c} size="small" color={category === c ? 'primary' : 'default'} onClick={() => setCategory(c)} />
            ))}
          </Stack>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1, maxHeight: 420, overflowY: 'auto' }}>
            {visible.map((g) => (
              <Card key={g.id} variant="outlined">
                <CardActionArea onClick={() => addGarment(g)}>
                  <CardMedia component="img" image={g.imageUrl} sx={{ height: 110, objectFit: 'contain', bgcolor: 'grey.100' }} />
                  <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                    <Typography variant="body2" noWrap>{g.name}</Typography>
                    {g.price > 0 && <Typography variant="caption" color="text.secondary">${g.price}</Typography>}
                  </CardContent>
                </CardActionArea>
              </Card>
            ))}
          </Box>
          {!visible.length && <Typography variant="body2" color="text.secondary">No garments yet. Add one to the catalog.</Typography>}
          <Button startIcon={<UploadIcon />} onClick={() => setAddOpen(true)}>Add garment to catalog</Button>
        </Stack>

        {/* Center: canvas */}
        <Box sx={{ justifySelf: 'center' }}>
          <TryOnCanvas
            stageRef={stageRef}
            fit={FIT}
            modelSrc={modelSrc}
            layers={layers}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onChangeLayer={updateLayer}
          />
        </Box>

        {/* Right: layers */}
        <Stack spacing={1}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth">
            <Tab label="Layers" />
            <Tab label="Adjust" disabled={!selected} />
          </Tabs>
          {tab === 0 || !selected ? (
            <List dense>
              {[...layers].reverse().map((l) => (
                <ListItem
                  key={l.id}
                  selected={l.id === selectedId}
                  onClick={() => setSelectedId(l.id)}
                  sx={{ cursor: 'pointer', borderRadius: 1 }}
                  secondaryAction={
                    <>
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); moveLayer(l.id, 1) }}><ArrowUpwardIcon fontSize="small" /></IconButton>
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); moveLayer(l.id, -1) }}><ArrowDownwardIcon fontSize="small" /></IconButton>
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); setLayers((ls) => ls.filter((x) => x.id !== l.id)) }}><DeleteIcon fontSize="small" /></IconButton>
                    </>
                  }
                >
                  <ListItemText primary={l.name} sx={{ pr: 12 }} />
                </ListItem>
              ))}
              {!layers.length && <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>Click a garment to put it on the model, then drag, resize and rotate it.</Typography>}
            </List>
          ) : (
            <Stack spacing={2} sx={{ p: 1 }}>
              <Typography variant="body2" noWrap>{selected.name}</Typography>
              <Box>
                <Typography variant="caption">Size</Typography>
                <Slider min={0.2} max={3} step={0.01} value={Math.abs(selected.scaleX)}
                  onChange={(_, v) => updateLayer(selected.id, { scaleX: Math.sign(selected.scaleX || 1) * v, scaleY: v })} />
              </Box>
              <Box>
                <Typography variant="caption">Rotation</Typography>
                <Slider min={-180} max={180} value={selected.rotation} onChange={(_, v) => updateLayer(selected.id, { rotation: v })} />
              </Box>
              <Box>
                <Typography variant="caption">Opacity</Typography>
                <Slider min={0.1} max={1} step={0.01} value={selected.opacity} onChange={(_, v) => updateLayer(selected.id, { opacity: v })} />
              </Box>
              <Tooltip title="Flip horizontally">
                <Button startIcon={<FlipIcon />} onClick={() => updateLayer(selected.id, { scaleX: -selected.scaleX })}>Flip</Button>
              </Tooltip>
            </Stack>
          )}
        </Stack>
      </Box>

      <AddGarmentDialog open={addOpen} onClose={() => setAddOpen(false)} onDone={() => { setAddOpen(false); refreshGarments(); notify('Garment added', 'success') }} onError={fail} />
      <SaveDialog open={saveOpen} onClose={() => setSaveOpen(false)} onSave={saveLook} />
      <Dialog open={looksOpen} onClose={() => setLooksOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>My looks</DialogTitle>
        <DialogContent>
          <List>
            {designs.map((d) => (
              <ListItem key={d.id} disablePadding secondaryAction={
                <IconButton onClick={() => api.deleteDesign(d.id).then(() => setDesigns((x) => x.filter((y) => y.id !== d.id))).catch(fail)}><DeleteIcon /></IconButton>
              }>
                <Button onClick={() => loadLook(d)} sx={{ justifyContent: 'flex-start', flexGrow: 1 }}>{d.name}</Button>
              </ListItem>
            ))}
            {!designs.length && <Typography color="text.secondary">No saved looks yet.</Typography>}
          </List>
        </DialogContent>
      </Dialog>
      <Dialog open={!!renderResult} onClose={() => setRenderResult(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Realistic preview</DialogTitle>
        <DialogContent>
          {renderResult && <Box component="img" src={renderResult} alt="Try-on result" sx={{ width: '100%', borderRadius: 2 }} />}
        </DialogContent>
        <DialogActions>
          <Button component="a" href={renderResult} download="tryon.png">Download</Button>
          <Button onClick={() => { setModelSrc(renderResult); setLayers([]); setSelectedId(null); setRenderResult(null) }}>
            Use as model (add another item)
          </Button>
          <Button variant="contained" onClick={() => setRenderResult(null)}>Close</Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)}>
        {toast ? <Alert severity={toast.severity} onClose={() => setToast(null)}>{toast.message}</Alert> : undefined}
      </Snackbar>
    </Box>
  )
}

function SaveDialog({ open, onClose, onSave }) {
  const [name, setName] = useState('')
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Save look</DialogTitle>
      <DialogContent>
        <TextField autoFocus fullWidth margin="dense" label="Name" value={name} onChange={(e) => setName(e.target.value)} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={!name.trim()} onClick={() => { onSave(name.trim()); setName('') }}>Save</Button>
      </DialogActions>
    </Dialog>
  )
}

function AddGarmentDialog({ open, onClose, onDone, onError }) {
  const [file, setFile] = useState(null)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('top')
  const [price, setPrice] = useState('')
  const [removeBg, setRemoveBg] = useState(true)
  const [busy, setBusy] = useState(false)

  async function submit() {
    setBusy(true)
    try {
      const blob = removeBg ? await removeWhiteBackground(file) : file
      const imageUrl = await api.uploadImage(blob)
      await api.createGarment({ name: name.trim(), category, price: Number(price) || 0, imageUrl })
      setFile(null); setName(''); setPrice('')
      onDone()
    } catch (err) { onError(err) } finally { setBusy(false) }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Add garment to catalog</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Button component="label" variant="outlined" startIcon={<UploadIcon />}>
            {file ? file.name : 'Choose image (PNG, JPEG, WebP)'}
            <input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </Button>
          <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <TextField select label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </TextField>
          <TextField label="Price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
          <FormControlLabel control={<Switch checked={removeBg} onChange={(e) => setRemoveBg(e.target.checked)} />} label="Remove white background" />
          <Divider />
          <Typography variant="caption" color="text.secondary">
            Use a front-facing flat-lay or ghost-mannequin photo, cropped tight around the garment.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={!file || !name.trim() || busy} onClick={submit}>{busy ? 'Uploading…' : 'Add'}</Button>
      </DialogActions>
    </Dialog>
  )
}
