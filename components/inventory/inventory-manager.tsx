"use client";
import{FormEvent,useEffect,useState}from"react";
type Product={id:string;name:string;sku:string;unit:string;purchasePrice:number;salePrice:number;taxRate:number;currentQuantity:number;minimumStock:number;lowStock:boolean;category?:{name:string}};
export function InventoryManager(){const[items,setItems]=useState<Product[]>([]),[search,setSearch]=useState(''),[open,setOpen]=useState(false),[adjust,setAdjust]=useState<Product>(),[error,setError]=useState(''),[saving,setSaving]=useState(false);async function load(){const r=await fetch(`/api/products?pageSize=100&search=${encodeURIComponent(search)}`),p=await r.json();r.ok?setItems(p.items):setError(p.error)}useEffect(()=>{const t=setTimeout(()=>{load().catch(()=>setError("Could not load products. Refresh and try again."))},200);return()=>clearTimeout(t)},[search]);async function create(e:FormEvent<HTMLFormElement>){
  e.preventDefault();
  const form=e.currentTarget;
  if(saving)return;
  setSaving(true);setError('');
  try{
    const r=await fetch('/api/products',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(form)))});
    if(!r.ok){setError((await r.json()).error||'Could not save product');return;}
    form.reset();setOpen(false);
    try{await load()}catch{setError('Product saved, but the list could not refresh. Reload before adding it again.')}
  }catch{setError('Could not confirm the save. Refresh and check the product list before retrying.')}
  finally{setSaving(false)}
}
async function doAdjust(e:FormEvent<HTMLFormElement>){
  e.preventDefault();const form=e.currentTarget;
  if(saving||!adjust)return;
  setSaving(true);setError('');
  try{
    const r=await fetch(`/api/products/${adjust.id}/adjust`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(form)))});
    if(!r.ok){setError((await r.json()).error||'Could not adjust stock');return;}
    setAdjust(undefined);
    try{await load()}catch{setError('Stock adjusted, but the list could not refresh. Reload to check the quantity.')}
  }catch{setError('Could not confirm the adjustment. Check the stock quantity before retrying.')}
  finally{setSaving(false)}
}
return <div className="space-y-5"><div className="flex justify-between"><div><h1 className="text-2xl font-bold">Product & Inventory</h1><p className="text-sm text-slate-500">Stock levels, pricing and adjustment audit trail.</p></div><button className="btn-primary" onClick={()=>setOpen(!open)}>+ Add product</button></div>{error&&<p className="bg-red-50 p-3 text-red-700">{error}</p>}{open&&<form onSubmit={create} className="panel grid gap-3 p-4 md:grid-cols-4"><input required name="name" className="field" placeholder="Product name"/><input required name="sku" className="field" placeholder="SKU"/><input required name="unit" className="field" placeholder="pcs/kg/box"/><input required name="purchasePrice" type="number" step="0.01" className="field" placeholder="Purchase price"/><input required name="salePrice" type="number" step="0.01" className="field" placeholder="Sale price"/><input name="taxRate" type="number" step="0.01" className="field" placeholder="Tax %"/><input name="minimumStock" type="number" step="0.001" className="field" placeholder="Minimum stock"/><button disabled={saving} className="btn-primary">{saving?"Saving...":"Save"}</button></form>}{adjust&&<form onSubmit={doAdjust} className="panel flex flex-wrap gap-3 border-amber-300 p-4"><div className="min-w-48"><b>Adjust: {adjust.name}</b><p className="text-xs">Current: {adjust.currentQuantity} {adjust.unit}</p></div><input required name="quantity" type="number" step="0.001" className="field max-w-40" placeholder="+/- quantity"/><input required name="note" className="field min-w-64 flex-1" placeholder="Reason: damage, loss, return…"/><button disabled={saving} className="btn-primary">{saving?"Applying...":"Apply"}</button><button type="button" className="btn-secondary" onClick={()=>setAdjust(undefined)}>Cancel</button></form>}<div className="panel overflow-hidden"><div className="border-b p-4"><input className="field max-w-sm" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search product or SKU…"/></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50"><tr><th className="p-4 text-left">Product</th><th className="p-4 text-left">SKU</th><th className="p-4">Purchase</th><th className="p-4">Sale</th><th className="p-4">Stock</th><th className="p-4">Status</th><th className="p-4"></th></tr></thead><tbody className="divide-y">{items.map(x=><tr key={x.id}><td className="p-4 font-semibold">{x.name}<p className="text-xs font-normal text-slate-500">{x.category?.name||'Uncategorized'} · {x.unit}</p></td><td className="p-4">{x.sku}</td><td className="p-4 text-center">{x.purchasePrice.toLocaleString()}</td><td className="p-4 text-center">{x.salePrice.toLocaleString()}</td><td className={`p-4 text-center font-bold ${x.lowStock?'text-red-700':'text-green-700'}`}>{x.currentQuantity}</td><td className="p-4 text-center"><span className={`rounded px-2 py-1 text-xs ${x.lowStock?'bg-red-100 text-red-700':'bg-green-100 text-green-700'}`}>{x.lowStock?'LOW STOCK':'HEALTHY'}</span></td><td className="p-4"><button className="font-semibold text-blue-800" onClick={()=>setAdjust(x)}>Adjust</button></td></tr>)}</tbody></table></div></div></div>}
