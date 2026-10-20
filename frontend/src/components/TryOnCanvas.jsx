import { useEffect, useRef } from 'react'
import { Stage, Layer, Image as KImage, Transformer } from 'react-konva'
import { useImage } from '../imageUtils'

export const STAGE_W = 600
export const STAGE_H = 800

function GarmentNode({ layer, selected, onSelect, onChange }) {
  const img = useImage(layer.src)
  const nodeRef = useRef()
  const trRef = useRef()

  useEffect(() => {
    if (selected && trRef.current && nodeRef.current) {
      trRef.current.nodes([nodeRef.current])
      trRef.current.getLayer().batchDraw()
    }
  }, [selected, img])

  if (!img) return null
  return (
    <>
      <KImage
        ref={nodeRef}
        image={img}
        x={layer.x}
        y={layer.y}
        width={layer.width}
        height={layer.height}
        offsetX={layer.width / 2}
        offsetY={layer.height / 2}
        scaleX={layer.scaleX}
        scaleY={layer.scaleY}
        rotation={layer.rotation}
        opacity={layer.opacity}
        draggable
        onMouseDown={onSelect}
        onTouchStart={onSelect}
        onDragEnd={(e) => onChange({ x: e.target.x(), y: e.target.y() })}
        onTransformEnd={() => {
          const n = nodeRef.current
          onChange({ x: n.x(), y: n.y(), scaleX: n.scaleX(), scaleY: n.scaleY(), rotation: n.rotation() })
        }}
      />
      {selected && (
        <Transformer
          ref={trRef}
          rotateEnabled
          keepRatio
          enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
          boundBoxFunc={(oldBox, newBox) => (Math.abs(newBox.width) < 20 ? oldBox : newBox)}
        />
      )}
    </>
  )
}

export default function TryOnCanvas({ stageRef, modelSrc, layers, selectedId, onSelect, onChangeLayer, fit }) {
  const model = useImage(modelSrc)
  return (
    <Stage
      ref={stageRef}
      width={STAGE_W * fit}
      height={STAGE_H * fit}
      scaleX={fit}
      scaleY={fit}
      onMouseDown={(e) => e.target === e.target.getStage() && onSelect(null)}
      onTouchStart={(e) => e.target === e.target.getStage() && onSelect(null)}
      style={{ background: '#f1f1f4', borderRadius: 12, overflow: 'hidden', touchAction: 'none' }}
    >
      <Layer listening={false}>
        {model && <KImage image={model} width={STAGE_W} height={STAGE_H} />}
      </Layer>
      <Layer>
        {layers.map((l) => (
          <GarmentNode
            key={l.id}
            layer={l}
            selected={l.id === selectedId}
            onSelect={() => onSelect(l.id)}
            onChange={(patch) => onChangeLayer(l.id, patch)}
          />
        ))}
      </Layer>
    </Stage>
  )
}
