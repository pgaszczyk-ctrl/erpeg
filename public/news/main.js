const dialog=document.getElementById('photo');
const large=document.getElementById('large-photo');
document.querySelectorAll('[data-image]').forEach(button=>button.addEventListener('click',()=>{large.src=button.dataset.image;large.alt=button.querySelector('img').alt;dialog.showModal();}));
document.getElementById('close-photo').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();}});
const slides=[...document.querySelectorAll('.slide')];
let slideIndex=0;
function showSlide(step){slideIndex=(slideIndex+step+slides.length)%slides.length;slides.forEach((slide,i)=>slide.hidden=i!==slideIndex);document.getElementById('slide-count').textContent=`${slideIndex+1} / ${slides.length}`;}
document.querySelectorAll('[data-step]').forEach(button=>button.addEventListener('click',()=>showSlide(Number(button.dataset.step))));
const carousel=document.querySelector('.carousel');
carousel?.addEventListener('keydown',event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();showSlide(event.key==='ArrowRight'?1:-1);}});
let touchX=0;carousel?.addEventListener('touchstart',e=>{touchX=e.changedTouches[0].clientX;},{passive:true});carousel?.addEventListener('touchend',e=>{const dx=e.changedTouches[0].clientX-touchX;if(Math.abs(dx)>50)showSlide(dx<0?1:-1);},{passive:true});
