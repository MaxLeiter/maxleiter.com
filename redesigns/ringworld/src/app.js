const P = new URLSearchParams(location.search)
Render.init(document.getElementById('bg'), { pose: P.get('pose') || 'main', quality: P.get('q') || 'auto' }).then(() => { window.__ready = true; console.log('renderer', Render.info.kind, Render.info.adapterInfo) })
