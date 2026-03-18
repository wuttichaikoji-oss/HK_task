(function(){
  const defaults = [
    { code:'1101', name:'FO Main', role:'fo', department:'Front Office', position:'Front Office' },
    { code:'9101', name:'Supervisor 1', role:'supervisor', department:'Management', position:'Supervisor' },
    { code:'9102', name:'Supervisor 2', role:'supervisor', department:'Management', position:'Supervisor' }
  ];
  const localKey = 'hk_users_v2_0_3';
  function normalizeUser(u){
    const role = ['fo','hk','supervisor'].includes(String(u?.role||'')) ? String(u.role) : 'hk';
    const department = u?.department || (role==='fo' ? 'Front Office' : role==='supervisor' ? 'Management' : 'HouseKeeping');
    return {
      code: String(u?.code||'').trim(),
      name: String(u?.name||'').trim(),
      role,
      department,
      position: String(u?.position||department).trim()
    };
  }
  function safeLoad(){
    try{
      const raw = JSON.parse(localStorage.getItem(localKey)||'[]');
      if(Array.isArray(raw) && raw.length) return raw.map(normalizeUser).filter(u=>u.code && u.name);
    }catch{}
    return defaults.map(normalizeUser);
  }
  window.APP_DEFAULT_USERS = defaults.map(normalizeUser);
  window.APP_USERS = safeLoad();
  window.USERS = window.APP_USERS;
})();
