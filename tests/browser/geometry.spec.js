import {test,expect} from '@playwright/test';
test('each physical piece contains rendered triangles',async({page})=>{
 const errors=[];page.on('console',m=>{if(m.type()==='error'||m.text().includes('THREE.LDrawLoader:'))errors.push(m.text());});
 await page.goto('/');await page.waitForFunction(()=>window.__assembly);await page.evaluate(()=>window.__assembly.select(7));
 const stats=await page.evaluate(()=>window.__assembly.viewer.nodes.map(n=>{let triangles=0,meshes=0;n.wrapper.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;}});return {part:n.p.part,meshes,triangles};}));
 expect(stats).toHaveLength(19);for(const s of stats)expect(s.triangles).toBeGreaterThan(20);expect(errors).toEqual([]);
 await page.evaluate(()=>window.__assembly.select(12));
 const sub=await page.evaluate(()=>window.__assembly.viewer.nodes.map(n=>{let meshes=0;n.wrapper.traverse(o=>{if(o.isMesh)meshes++;});return meshes;}));expect(sub).toHaveLength(11);for(const meshes of sub)expect(meshes).toBeGreaterThan(0);
});
