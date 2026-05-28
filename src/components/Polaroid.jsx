export default function Polaroid({ src, rotate = 0, w = 180, h = 200, caption, className = '', faded = false, style = {}, children }) {
  return (
    <div
      className={`polaroid ${faded ? 'film-faded' : ''} ${className}`}
      style={{ width: w, transform: `rotate(${rotate}deg)`, ...style }}
    >
      <div className="polaroid-photo" style={{ width: '100%', height: h }}>
        {src && <img src={src} alt="" loading="lazy" />}
        {children}
      </div>
      {caption && (
        <div className="hand text-center mt-2 text-[15px]" style={{ color: 'var(--sepia-soft)' }}>
          {caption}
        </div>
      )}
    </div>
  )
}
