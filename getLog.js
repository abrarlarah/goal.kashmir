async function getLog() { 
  const r = await fetch('https://api.github.com/repos/abrarlarah/goal.kashmir/actions/runs/29326759541/jobs'); 
  const d = await r.json(); 
  const job = d.jobs[0]; 
  const logRes = await fetch('https://api.github.com/repos/abrarlarah/goal.kashmir/actions/jobs/' + job.id + '/logs'); 
  console.log(await logRes.text()); 
} 
getLog();
