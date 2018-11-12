self.addEventListener('message', (event) => {
  
  if (!event.data){
    return;
  }
  
  switch (event.data) {
    case 'mx_install':
      self.skipWaiting();
      break;
    default:
      // NOOP
      break;
  }
});
