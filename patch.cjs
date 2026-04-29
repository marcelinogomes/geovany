const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const anchor1 = '<motion.div \n                    key={product.id}\n                    whileHover={{ y: -8 }}\n                    className="min-w-[240px] bg-white p-3 rounded-2xl border border-zinc-200 shadow-sm hover:shadow-xl transition-all duration-500 group"\n                  >';

const anchor2 = 'Adicionar ao Carrinho\n                    </button>\n                  </motion.div>';

const start = code.indexOf(anchor1);
const end = code.indexOf(anchor2) + anchor2.length;

if (start !== -1 && end !== -1 && end > start) {
  const target = code.substring(start, end);
  const replacement = `<motion.div 
                    key={product.id}
                    whileHover={{ y: -2 }}
                    className="group bg-white rounded-sm border border-transparent hover:border-[#ee4d2d] shadow-[0_1px_1px_rgba(0,0,0,0.05)] hover:shadow-lg transition-all duration-300 overflow-hidden relative cursor-pointer min-w-[200px]"
                    onClick={() => setSelectedProduct(product)}
                  >
                    <div className="relative aspect-square w-full overflow-hidden bg-zinc-100">
                      <img src={product.image} className="w-full h-full object-cover transition duration-300" alt={product.name} />
                      
                      {product.oldPrice && (
                        <div className="absolute top-0 right-0 bg-yellow-400/90 text-[#ee4d2d] flex flex-col items-center justify-center px-1.5 py-1 z-10 w-10">
                          <span className="text-[10px] font-bold leading-none">{Math.round((1 - product.price/product.oldPrice) * 100)}%</span>
                          <span className="text-[9px] font-bold uppercase leading-none mt-0.5 text-white">OFF</span>
                          <div className="absolute -bottom-1 left-0 border-l-[20px] border-l-transparent border-t-[4px] border-t-yellow-400/90 border-r-[20px] border-r-transparent"></div>
                        </div>
                      )}

                      <div className="absolute bottom-0 left-0 w-full h-1/5 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>

                      <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-300 flex items-center justify-center z-20">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setSelectedProduct(product); }}
                          className="px-4 py-2 bg-[#ee4d2d] text-white rounded-sm font-medium text-[11px] uppercase tracking-wider flex items-center gap-1.5 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 pointer-events-auto shadow-xl"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eye w-3.5 h-3.5"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                          Visão Rápida
                        </button>
                      </div>
                    </div>
                    <div className="p-2 sm:p-2.5 flex flex-col h-[115px]">
                      <h5 className="text-sm text-zinc-800 line-clamp-2 leading-tight mb-2 min-h-[40px] group-hover:text-[#ee4d2d] transition-colors font-medium">{product.name}</h5>
                      <div className="mt-auto">
                        <div className="flex items-baseline gap-1 break-all mb-0.5">
                          <span className="text-xs text-[#ee4d2d]">R$</span>
                          <span className="text-lg font-medium text-[#ee4d2d] leading-none">
                            {product.price.toFixed(2)}
                          </span>
                        </div>
                        {product.oldPrice && (
                          <span className="text-[11px] text-zinc-400 line-through mb-1 truncate block">R$ {product.oldPrice.toFixed(2)}</span>
                        )}
                        <div className="w-full bg-zinc-200 rounded-full h-[6px] mt-2 overflow-hidden relative">
                           <div className="absolute top-0 left-0 h-full bg-[#ee4d2d] w-[75%]"></div>
                        </div>
                        <p className="text-[9px] text-[#ee4d2d] font-bold mt-1 uppercase text-center tracking-tight">Esgotando rápido</p>
                      </div>
                    </div>
                  </motion.div>`;
  
  code = code.replace(target, replacement);
  fs.writeFileSync('src/App.tsx', code);
  console.log("Replaced successfully!");
} else {
  console.log("Could not find boundaries", start, end);
}
