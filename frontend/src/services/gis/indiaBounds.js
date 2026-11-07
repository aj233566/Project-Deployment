const INDIA_OUTLINE = [
  [74.0, 34.6],               
  [77.2, 35.6],                 
  [79.5, 34.6],                
  [80.5, 30.6],                                  
  [80.2, 28.7],                      
  [84.0, 27.0],                                 
  [88.0, 26.8],                              
  [89.7, 26.5],                     
  [92.0, 27.8],                   
  [94.5, 27.6],                      
  [97.4, 28.3],                   
  [97.0, 26.5],                           
  [95.2, 24.0],                           
  [93.3, 22.0],                  
  [91.3, 22.0],            
  [89.2, 21.8],                                   
  [88.0, 21.4],               
  [84.5, 18.5],                 
  [80.3, 13.0],            
  [79.9, 9.5],                      
  [77.5, 7.9],                             
  [75.0, 12.0],                 
  [73.0, 16.0],           
  [72.6, 19.1],           
  [68.8, 22.0],          
  [68.0, 24.2],                        
  [70.1, 28.0],                   
  [72.6, 31.0],                  
  [74.0, 32.6],                   
];
export function isWithinIndia(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number' || Number.isNaN(lat) || Number.isNaN(lng)) {
    return false;
  }
  const x = lng;
  const y = lat;
  let inside = false;
  for (let i = 0, j = INDIA_OUTLINE.length - 1; i < INDIA_OUTLINE.length; j = i++) {
    const [xi, yi] = INDIA_OUTLINE[i];
    const [xj, yj] = INDIA_OUTLINE[j];
    const intersects = (yi > y) !== (yj > y)
      && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}
export default isWithinIndia;
