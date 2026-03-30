import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';

export default function ImpressioComunicat({ comunicat, mapaRef }) {

 const printRef = useRef();
 const [mapaImg, setMapaImg] = useState("");

 const handlePrint = async () => {
   if (mapaRef && mapaRef.current) {
     const mapCanvas = await html2canvas(mapaRef.current);
     const imgData = mapCanvas.toDataURL('image/png');
     setMapaImg(imgData);
   }

   setTimeout(() => {
     window.print();
   }, 500);
 };

 return (
   <div>
     <div className="comunicat-impressio" ref={printRef} style={{ padding: '20px', fontFamily: 'sans-serif' }}>
       <div style={{ textAlign: 'center' }}>
         <img src="/ajuntament.png" alt="Logo Ajuntament" style={{ height: '60px', marginBottom: '10px' }} />
         <h1>Comunicat de feina</h1>
         <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold', marginTop: '5px' }}>Brigada de jardineria</h2>
       </div>

       <p><strong>Email:</strong> {comunicat.email}</p>
       <p><strong>Data:</strong> {comunicat.data}</p>
       <p><strong>Responsable brigada:</strong> {comunicat.responsableBrigada}</p>
       <p><strong>Oficial responsable:</strong> {comunicat.oficialResponsable}</p>
       <p><strong>Oficials:</strong> {(comunicat.oficial || []).join(", ")}</p>
       <p><strong>Peons:</strong> {(comunicat.peo || []).join(", ")}</p>
       <p><strong>Incidència:</strong> {comunicat.incidencia}</p>
       <p><strong>Matrícula:</strong>{" "}
        {Array.isArray(comunicat.matricula)
          ? comunicat.matricula.join(", ")
          : comunicat.matricula || ""}</p>
       <p><strong>Ruta:</strong> {comunicat.ruta}</p>
       <p><strong>Eines:</strong> {(comunicat.eines || []).join(", ")}</p>
       <p><strong>Tasques:</strong> {(comunicat.feines || []).join(", ")}</p>
       <p><strong>Observacions:</strong> {comunicat.observacions}</p>

       <div style={{ marginTop: '40px', textAlign: 'center' }}>
         <p><strong>Signatura oficial responsable:</strong></p>
         <div style={{ borderBottom: '1px solid black', width: '200px', margin: '20px auto' }}></div>
         <p>{comunicat.oficialResponsable}</p>
       </div>

       {mapaImg && (
         <div style={{ marginTop: '20px' }}>
           <h3>Ruta al mapa:</h3>
           <img src={mapaImg} alt="Mapa ruta" style={{ width: '100%', maxWidth: '600px' }} />
         </div>
       )}

       {/* Bloc de seguretat laboral */}
       <div style={{
         borderTop: '2px solid #e2e2e2',
         marginTop: '40px',
         paddingTop: '20px',
         backgroundColor: '#f9f9f9',
         padding: '15px',
         borderRadius: '8px'
       }}>
         <h3 style={{ color: '#d9534f', textAlign: 'center', marginBottom: '10px' }}>
           ⚠️ Recordatori de seguretat i prevenció de riscos laborals ⚠️
         </h3>
         <ul style={{ listStyle: 'none', padding: 0, fontSize: '15px' }}>
           <li>🦺 Utilitzar els EPI (Equips de Protecció Individual) adequats.</li>
           <li>📍 Respectar la senyalització i les instruccions específiques de seguretat.</li>
           <li>📢 Comunicar immediatament qualsevol incidència o situació de risc al responsable.</li>
         </ul>
         <p style={{ marginTop: '10px', fontWeight: 'bold', textAlign: 'center' }}>
           ✔️ La seguretat és responsabilitat de tothom. Treballem segurs!
         </p>
       </div>
     </div>

     <button onClick={handlePrint} style={{ marginTop: '20px' }}>
       🖨️ Previsualitzar i Imprimir
     </button>
   </div>
 );
}