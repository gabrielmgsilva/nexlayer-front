import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { STLLoader } from 'three/addons/loaders/STLLoader.js'
import { ThreeMFLoader } from 'three/addons/loaders/3MFLoader.js'
import { Btn, Icon, Icons, NEX } from '@/lib/nex'
import { productsService } from '@/services/entities.service'
import type { Product } from '@/types/api.types'

type ProductPrintFile = Product['printFiles'][number]
type PreviewFormat = '3mf' | 'stl'
type ViewTarget = { id: string; label: string; object: THREE.Object3D }

function getPreviewFormat(file: ProductPrintFile): PreviewFormat | null {
  const format = file.format?.toLowerCase()
  const url = file.url.toLowerCase()

  if (format === '3mf' || url.endsWith('.3mf')) return '3mf'
  if (format === 'stl' || format === 'slt' || url.endsWith('.stl') || url.endsWith('.slt')) return 'stl'
  return null
}

export default function ModelPreviewModal({ productId, file, onClose }: { productId: string; file: ProductPrintFile; onClose: () => void }) {
  const format = getPreviewFormat(file)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ background: 'rgba(3, 8, 14, 0.78)' }} onClick={onClose} />

      <div
        className="relative w-full max-w-6xl rounded-xl overflow-hidden"
        style={{ background: NEX.surface, border: `1px solid ${NEX.border}`, boxShadow: `0 28px 70px ${NEX.bg}` }}
      >
        <div className="px-4 py-3 flex items-center gap-3" style={{ borderBottom: `1px solid ${NEX.border}` }}>
          <div className="h-7 w-7 rounded-md flex items-center justify-center" style={{ background: NEX.surface2, border: `1px solid ${NEX.border}` }}>
            <Icon d={Icons.cube} size={14} style={{ color: NEX.cyan }} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold truncate">Visualizacao {format?.toUpperCase() ?? '3D'}</div>
            <div className="text-[11px] truncate" style={{ color: NEX.textDim }}>{file.filename}</div>
          </div>

          <Btn kind="ghost" size="sm" icon={Icons.external} onClick={() => window.open(file.url, '_blank', 'noopener,noreferrer')}>
            Abrir original
          </Btn>
          <Btn kind="ghost" size="sm" icon={Icons.x} onClick={onClose}>Fechar</Btn>
        </div>

        <div className="h-[65vh] min-h-[360px]" style={{ background: '#0f131a' }}>
          {format ? (
              <ModelViewport productId={productId} url={file.url} format={format} />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-[12px]" style={{ color: '#ffb8b8' }}>
              Formato nao suportado para visualizacao.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function orientObjectForViewport(object: THREE.Object3D, format: PreviewFormat) {
  if (format === '3mf' || format === 'stl') {
    // Print files are typically authored as Z-up; rotate to Three.js Y-up world.
    object.rotation.x = -Math.PI / 2
  }
}

function normalizeObjectPosition(object: THREE.Object3D) {
  object.updateMatrixWorld(true)

  const initialBox = new THREE.Box3().setFromObject(object)
  if (initialBox.isEmpty()) return

  const initialSize = initialBox.getSize(new THREE.Vector3())
  object.position.x -= initialBox.min.x + initialSize.x / 2
  object.position.z -= initialBox.min.z + initialSize.z / 2
  object.position.y -= initialBox.min.y

  object.updateMatrixWorld(true)
}

function frameObject(
  object: THREE.Object3D,
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
) {
  object.updateMatrixWorld(true)

  const box = new THREE.Box3().setFromObject(object)
  if (box.isEmpty()) return

  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  const maxDim = Math.max(size.x, size.y, size.z, 1)
  const fitDistance = maxDim * 1.9

  camera.position.set(
    center.x + fitDistance,
    center.y + fitDistance * 0.66,
    center.z + fitDistance,
  )
  camera.near = Math.max(maxDim / 1000, 0.01)
  camera.far = maxDim * 120
  camera.updateProjectionMatrix()

  controls.maxDistance = maxDim * 20
  controls.target.copy(center)
  controls.update()
}

function objectHasMesh(object: THREE.Object3D) {
  let hasMesh = false
  object.traverse((node) => {
    const mesh = node as THREE.Mesh
    if (mesh.isMesh && mesh.geometry) hasMesh = true
  })
  return hasMesh
}

function isDescendantOf(node: THREE.Object3D, ancestor: THREE.Object3D) {
  let current = node.parent
  while (current) {
    if (current === ancestor) return true
    current = current.parent
  }
  return false
}

function resolveViewTargets(root: THREE.Object3D) {
  const namedCandidates: THREE.Object3D[] = []

  root.traverse((node) => {
    if (node === root) return
    const normalizedName = node.name.trim().toLowerCase()
    if (!normalizedName) return
    if (!/(mesa|plate|build)/i.test(normalizedName)) return
    if (!objectHasMesh(node)) return
    namedCandidates.push(node)
  })

  const topNamed = namedCandidates.filter(
    (candidate) => !namedCandidates.some((other) => other !== candidate && isDescendantOf(candidate, other)),
  )

  if (topNamed.length >= 2) {
    return topNamed.map((object, index) => ({
      id: `named-${index}`,
      label: object.name?.trim() ? `Mesa ${index + 1} · ${object.name.trim()}` : `Mesa ${index + 1}`,
      object,
    }))
  }

  const directChildrenWithMesh = root.children.filter((child) => objectHasMesh(child))
  if (directChildrenWithMesh.length >= 2 && directChildrenWithMesh.length <= 12) {
    return directChildrenWithMesh.map((object, index) => ({
      id: `child-${index}`,
      label: object.name?.trim() ? `Mesa ${index + 1} · ${object.name.trim()}` : `Mesa ${index + 1}`,
      object,
    }))
  }

  return []
}

function disposeObject(root: THREE.Object3D) {
  root.traverse((node) => {
    const mesh = node as THREE.Mesh
    if (mesh.geometry) {
      mesh.geometry.dispose()
    }

    if (mesh.material) {
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((mat) => mat.dispose())
      } else {
        mesh.material.dispose()
      }
    }
  })
}

function buildPreviewError(error: unknown, format: PreviewFormat) {
  const raw = error instanceof Error ? error.message : String(error)

  if (raw.includes('HTTP 403') || raw.includes('HTTP 401')) {
    return 'Acesso negado ao arquivo 3D (permissao/CORS).'
  }

  if (raw.includes('HTTP 404')) {
    return 'Arquivo 3D nao encontrado (404).'
  }

  if (raw.includes('Failed to fetch') || raw.includes('Load failed') || raw.includes('NetworkError')) {
    return 'Falha de rede ao buscar o arquivo 3D. Verifique acesso/CORS.'
  }

  const normalizedFormat = format.toUpperCase()
  const detail = raw.length > 140 ? `${raw.slice(0, 140)}...` : raw
  return `Nao foi possivel processar o arquivo ${normalizedFormat}. Detalhe: ${detail}`
}

function ModelViewport({ productId, url, format }: { productId: string; url: string; format: PreviewFormat }) {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const viewerRef = useRef<{
    root: THREE.Object3D | null
    camera: THREE.PerspectiveCamera | null
    controls: OrbitControls | null
    viewTargets: ViewTarget[]
  }>({
    root: null,
    camera: null,
    controls: null,
    viewTargets: [],
  })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewTargets, setViewTargets] = useState<Array<{ id: string; label: string }>>([])
  const [activeTargetId, setActiveTargetId] = useState<string>('all')

  const activateViewTarget = (targetId: string) => {
    const viewer = viewerRef.current
    const root = viewer.root
    const camera = viewer.camera
    const controls = viewer.controls

    if (!root || !camera || !controls) return

    if (targetId === 'all') {
      viewer.viewTargets.forEach((target) => {
        target.object.visible = true
      })
      frameObject(root, camera, controls)
      setActiveTargetId('all')
      return
    }

    const selectedTarget = viewer.viewTargets.find((target) => target.id === targetId)
    if (!selectedTarget) return

    viewer.viewTargets.forEach((target) => {
      target.object.visible = target.id === targetId
    })
    frameObject(selectedTarget.object, camera, controls)
    setActiveTargetId(targetId)
  }

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const abort = new AbortController()
    let frame = 0
    let disposed = false
    let loadedObject: THREE.Object3D | null = null

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#0f131a')

    const camera = new THREE.PerspectiveCamera(45, mount.clientWidth / mount.clientHeight, 0.1, 10000)
    camera.position.set(180, 120, 180)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    mount.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.06

    scene.add(new THREE.AmbientLight('#ffffff', 0.68))

    viewerRef.current.camera = camera
    viewerRef.current.controls = controls
    viewerRef.current.root = null
    viewerRef.current.viewTargets = []
    setViewTargets([])
    setActiveTargetId('all')

    const keyLight = new THREE.DirectionalLight('#ffffff', 0.9)
    keyLight.position.set(140, 140, 70)
    scene.add(keyLight)

    const fillLight = new THREE.DirectionalLight('#66d9ff', 0.35)
    fillLight.position.set(-120, 80, -100)
    scene.add(fillLight)

    scene.add(new THREE.GridHelper(300, 30, '#2a3a4a', '#18222d'))

    setLoading(true)
    setError(null)

    void (async () => {
      try {
        const buffer = await productsService.getPrintFileViewContent(productId, url)

        if (abort.signal.aborted) return
        if (disposed) return

        let modelRoot: THREE.Object3D

        if (format === '3mf') {
          const loader = new ThreeMFLoader()
          const group = loader.parse(buffer)
          modelRoot = group
        } else {
          const loader = new STLLoader()
          const geometry = loader.parse(buffer)
          geometry.computeVertexNormals()

          const material = new THREE.MeshStandardMaterial({
            color: '#9de5ff',
            metalness: 0.2,
            roughness: 0.58,
          })

          modelRoot = new THREE.Mesh(geometry, material)
        }

        loadedObject = modelRoot
        orientObjectForViewport(modelRoot, format)
        normalizeObjectPosition(modelRoot)
        scene.add(modelRoot)

        const targets = resolveViewTargets(modelRoot)
        viewerRef.current.root = modelRoot
        viewerRef.current.viewTargets = targets

        if (targets.length > 1) {
          setViewTargets(targets.map((target) => ({ id: target.id, label: target.label })))
        } else {
          setViewTargets([])
        }

        frameObject(modelRoot, camera, controls)
        setLoading(false)
      } catch (error) {
        if (disposed) return
        if (error instanceof Error && error.name === 'AbortError') return

        setError(buildPreviewError(error, format))
        setLoading(false)
      }
    })()

    const resize = () => {
      if (!mount) return
      const { clientWidth, clientHeight } = mount
      if (!clientWidth || !clientHeight) return
      camera.aspect = clientWidth / clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(clientWidth, clientHeight)
    }

    const observer = new ResizeObserver(resize)
    observer.observe(mount)

    const renderLoop = () => {
      controls.update()
      renderer.render(scene, camera)
      frame = window.requestAnimationFrame(renderLoop)
    }
    renderLoop()

    return () => {
      disposed = true
      abort.abort()
      window.cancelAnimationFrame(frame)
      observer.disconnect()
      controls.dispose()

      if (loadedObject) {
        disposeObject(loadedObject)
      }

      viewerRef.current.root = null
      viewerRef.current.camera = null
      viewerRef.current.controls = null
      viewerRef.current.viewTargets = []

      renderer.dispose()
      if (renderer.domElement.parentElement === mount) {
        mount.removeChild(renderer.domElement)
      }
    }
  }, [productId, url, format])

  return (
    <div className="relative h-full w-full">
      <div ref={mountRef} className="h-full w-full" />

      {!loading && !error && viewTargets.length > 1 && (
        <div
          className="absolute top-3 left-3 rounded-md p-2 max-w-[420px]"
          style={{ background: 'rgba(7, 11, 17, 0.82)', border: `1px solid ${NEX.border}` }}
        >
          <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: NEX.textMute }}>
            Mesas detectadas
          </div>
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => activateViewTarget('all')}
              className="px-2 py-1 rounded text-[11px]"
              style={{
                background: activeTargetId === 'all' ? NEX.cyanDim : NEX.surface2,
                color: activeTargetId === 'all' ? NEX.cyan : NEX.textDim,
                border: `1px solid ${NEX.border}`,
              }}
            >
              Todas
            </button>

            {viewTargets.map((target) => (
              <button
                key={target.id}
                type="button"
                onClick={() => activateViewTarget(target.id)}
                className="px-2 py-1 rounded text-[11px]"
                style={{
                  background: activeTargetId === target.id ? NEX.cyanDim : NEX.surface2,
                  color: activeTargetId === target.id ? NEX.cyan : NEX.textDim,
                  border: `1px solid ${NEX.border}`,
                }}
              >
                {target.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center text-[12px]" style={{ color: '#a7b3c2', background: 'rgba(7, 11, 17, 0.35)' }}>
          Carregando modelo 3D...
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-[12px]" style={{ color: '#ffb8b8', background: 'rgba(12, 7, 7, 0.5)' }}>
          {error}
        </div>
      )}
    </div>
  )
}
