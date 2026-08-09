import '@testing-library/jest-dom/vitest';

if(typeof HTMLDialogElement!=='undefined'){
  HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','')};
  HTMLDialogElement.prototype.close=function(){const wasOpen=this.hasAttribute('open');this.removeAttribute('open');if(wasOpen)this.dispatchEvent(new Event('close'))};
}
