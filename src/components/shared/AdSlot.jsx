// src/components/shared/AdSlot.jsx
import { useEffect } from 'react'

const AD_CLIENT = 'ca-pub-6163036693948238'

export function AdSlot({ id = 'default', type = 'rectangle' }) {
  useEffect(() => {
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}) }
    catch { /* not loaded */ }
  }, [id])

  if (type === 'rectangle') return (
    <div className="flex justify-center my-4">
      <ins className="adsbygoogle"
        style={{ display: 'inline-block', width: '300px', height: '250px' }}
        data-ad-client={AD_CLIENT}
        data-ad-slot="REPLACE_SLOT_1" />
    </div>
  )

  if (type === 'leaderboard') return (
    <div className="flex justify-center my-4 overflow-x-hidden">
      <ins className="adsbygoogle"
        style={{ display: 'inline-block', width: '728px', height: '90px', maxWidth: '100%' }}
        data-ad-client={AD_CLIENT}
        data-ad-slot="REPLACE_SLOT_2"
        data-ad-format="horizontal" />
    </div>
  )

  return (
    <div className="my-4">
      <ins className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={AD_CLIENT}
        data-ad-slot="REPLACE_SLOT_3"
        data-ad-format="auto"
        data-full-width-responsive="true" />
    </div>
  )
}

export default AdSlot
