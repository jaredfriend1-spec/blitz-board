import './globals.css'
import BottomNav from '@/components/BottomNav'
import { AuthProvider } from '@/components/AuthProvider'
import type { Metadata, Viewport } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'

export const metadata: Metadata = {
  title: 'Blitz Board',
  description: 'Golf tournament scoring — live scorer, payouts, skins',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Blitz Board',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icon-180.png', sizes: '180x180', type: 'image/png' },
    ],
  },
}

export const viewport: Viewport = {
  themeColor: '#10b981',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <head>
        <meta name="mobile-web-app-capable" content="yes"/>
        <meta name="apple-mobile-web-app-capable" content="yes"/>
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>
        <meta name="apple-mobile-web-app-title" content="Blitz Board"/>
        <link rel="apple-touch-icon" href="/icon-180.png"/>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(reg) { console.log('SW registered'); })
                    .catch(function(err) { console.log('SW failed: ', err); });
                });
              }

              let deferredPrompt;
              window.addEventListener('beforeinstallprompt', function(e) {
                e.preventDefault();
                deferredPrompt = e;
                var banner = document.getElementById('pwa-install-banner');
                if (banner) banner.style.display = 'flex';
              });

              window.addEventListener('DOMContentLoaded', function() {
                var btn = document.getElementById('pwa-install-btn');
                var banner = document.getElementById('pwa-install-banner');
                var dismiss = document.getElementById('pwa-install-dismiss');
                if (btn) {
                  btn.addEventListener('click', function() {
                    if (deferredPrompt) {
                      deferredPrompt.prompt();
                      deferredPrompt.userChoice.then(function() {
                        deferredPrompt = null;
                        if (banner) banner.style.display = 'none';
                      });
                    }
                  });
                }
                if (dismiss) {
                  dismiss.addEventListener('click', function() {
                    if (banner) banner.style.display = 'none';
                    sessionStorage.setItem('pwa-dismissed', 'true');
                  });
                }
                if (sessionStorage.getItem('pwa-dismissed') === 'true') {
                  if (banner) banner.style.display = 'none';
                }
                if (window.matchMedia('(display-mode: standalone)').matches) {
                  if (banner) banner.style.display = 'none';
                }
              });

              window.addEventListener('appinstalled', function() {
                var banner = document.getElementById('pwa-install-banner');
                if (banner) banner.style.display = 'none';
                deferredPrompt = null;
              });
            `,
          }}
        />
      </head>
      <body className="bg-black text-white antialiased pb-20">

        {/* PWA Install Banner */}
        <div
          id="pwa-install-banner"
          style={{
            display: 'none',
            position: 'fixed',
            bottom: '80px',
            left: '16px',
            right: '16px',
            zIndex: 9999,
            background: '#18181b',
            border: '2px solid #10b981',
            borderRadius: '20px',
            padding: '14px 16px',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          }}
        >
          <img src="/icon-192.png" alt="Blitz Board" style={{width:'44px',height:'44px',borderRadius:'10px',flexShrink:0}}/>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:700,fontSize:'14px',color:'#fff',letterSpacing:'0.01em'}}>
              Install Blitz Board
            </div>
            <div style={{fontSize:'11px',color:'#71717a',fontWeight:500,marginTop:'2px'}}>
              Add to home screen
            </div>
          </div>
          <button
            id="pwa-install-btn"
            style={{
              background:'#10b981',color:'#000',border:'none',
              borderRadius:'12px',padding:'8px 16px',
              fontWeight:700,fontSize:'12px',cursor:'pointer',flexShrink:0,
            }}
          >
            Install
          </button>
          <button
            id="pwa-install-dismiss"
            style={{
              background:'none',border:'none',color:'#52525b',
              fontSize:'20px',cursor:'pointer',padding:'0 4px',
              flexShrink:0,lineHeight:1,
            }}
          >
            ×
          </button>
        </div>

        <AuthProvider>{children}</AuthProvider>
        <BottomNav />
      </body>
    </html>
  )
}