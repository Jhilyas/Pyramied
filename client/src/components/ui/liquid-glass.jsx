import { useId, useMemo } from 'react';

/**
 * LiquidGlass — Apple-inspired glassmorphism component
 * Enhanced with specular lighting + displacement for premium refraction
 * 
 * @param {object} props
 * @param {string} props.variant - 'default' | 'solid' | 'elevated' | 'nav' | 'sidebar' | 'modal' | 'green'
 * @param {boolean} props.interactive - Adds hover/click effects
 * @param {boolean} props.distortion - Enables SVG liquid distortion
 * @param {number} props.displacementScale - SVG displacement intensity (default: 120)
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.as - HTML element type (default: 'div')
 * @param {object} props.style - Inline styles
 * @param {React.ReactNode} props.children
 */
export function LiquidGlass({
  variant = 'default',
  interactive = false,
  distortion = false,
  displacementScale = 100,
  className = '',
  as: Tag = 'div',
  style,
  children,
  ...rest
}) {
  const filterId = useId();
  const safeFilterId = `liquid-${filterId.replace(/:/g, '')}`;

  const variantClass = useMemo(() => {
    const map = {
      default: 'liquid-glass',
      solid: 'liquid-glass-solid',
      elevated: 'liquid-glass-elevated',
      nav: 'liquid-glass-nav',
      sidebar: 'liquid-glass-sidebar',
      modal: 'liquid-glass-modal',
      green: 'liquid-glass liquid-glass-green',
    };
    return map[variant] || map.default;
  }, [variant]);

  const classes = [
    variantClass,
    interactive && 'liquid-glass-interactive',
    className,
  ].filter(Boolean).join(' ');

  return (
    <Tag className={classes} style={style} {...rest}>
      {distortion && (
        <>
          <svg className="liquid-glass-svg-filter" aria-hidden="true">
            <defs>
              <filter id={safeFilterId}>
                {/* Fractal noise for organic distortion */}
                <feTurbulence
                  type="fractalNoise"
                  baseFrequency="0.006 0.006"
                  numOctaves="3"
                  seed="2"
                  result="noise"
                >
                  <animate
                    attributeName="seed"
                    from="0"
                    to="80"
                    dur="15s"
                    repeatCount="indefinite"
                  />
                </feTurbulence>

                {/* Soften the noise */}
                <feGaussianBlur in="noise" stdDeviation="2" result="softNoise" />

                {/* Specular lighting for glass shine — no water waves */}
                <feSpecularLighting
                  in="softNoise"
                  surfaceScale="3"
                  specularConstant="0.6"
                  specularExponent="80"
                  lightingColor="white"
                  result="specLight"
                >
                  <fePointLight x="-100" y="-100" z="200" />
                </feSpecularLighting>

                {/* Composite the light for subtle glass refraction */}
                <feComposite
                  in="specLight"
                  operator="arithmetic"
                  k1="0"
                  k2="0.3"
                  k3="0.7"
                  k4="0"
                  result="litImage"
                />

                {/* Displacement for subtle organic distortion */}
                <feDisplacementMap
                  in="SourceGraphic"
                  in2="softNoise"
                  scale={displacementScale}
                  xChannelSelector="R"
                  yChannelSelector="G"
                />
              </filter>
            </defs>
          </svg>
          <div
            className="liquid-glass-distortion"
            style={{ filter: `url(#${safeFilterId})` }}
          />
        </>
      )}
      {children}
    </Tag>
  );
}

export default LiquidGlass;
