const $ = (id) => document.getElementById(id);
const inputs = ["unitRmb","weightKg","shipRate","sellPrice","platformFee","fxRate"];

function money(n){return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(Number.isFinite(n)?n:0)}
function calculate(){
  const unitRmb = Number($("unitRmb").value || 0);
  const weight = Number($("weightKg").value || 0);
  const shippingRate = Number($("shipRate").value || 0);
  const selling = Number($("sellPrice").value || 0);
  const feePct = Number($("platformFee").value || 0) / 100;
  const fx = Math.max(Number($("fxRate").value || 1), .01);
  const productUsd = unitRmb / fx;
  const shippingUsd = weight * shippingRate;
  const platformFeeUsd = selling * feePct;
  const landed = productUsd + shippingUsd + platformFeeUsd;
  const profit = selling - landed;
  const margin = selling > 0 ? profit / selling : 0;
  $("landedCost").textContent = money(landed);
  $("grossProfit").textContent = money(profit);
  $("grossMargin").textContent = `${Math.round(margin*100)}%`;
  const signal = $("marginSignal");
  if(margin >= .35){signal.textContent="Healthy first-pass margin — worth supplier validation.";signal.style.background="#edf7f2";signal.style.color="#0a8f5b"}
  else if(margin >= .2){signal.textContent="Borderline margin — negotiate cost or validate freight.";signal.style.background="#fff7dd";signal.style.color="#8d6200"}
  else{signal.textContent="High-risk margin — probably not worth sampling yet.";signal.style.background="#fff0f0";signal.style.color="#b53131"}
}
inputs.forEach(id => $(id).addEventListener("input", calculate));
calculate();

$("loadSample").addEventListener("click",()=>{
  $("sampleTitle").textContent="Foldable magnetic phone stand";
  $("unitRmb").value="18.5"; $("weightKg").value="0.32"; $("shipRate").value="8.2"; $("sellPrice").value="19.99"; $("platformFee").value="15"; $("fxRate").value="7.2";
  calculate(); document.querySelector(".app-card").scrollIntoView({behavior:"smooth",block:"center"});
});

document.querySelectorAll(".price-card").forEach(card=>card.addEventListener("click",()=>{
  document.querySelectorAll(".price-card").forEach(c=>c.classList.remove("selected"));
  card.classList.add("selected");
  $("plan").value=card.dataset.plan;
  $("early-access").scrollIntoView({behavior:"smooth"});
}));

$("waitlistForm").addEventListener("submit",(event)=>{
  event.preventDefault();
  const fields = {
    Email: $("email").value,
    Channel: $("channel").value,
    Frequency: $("frequency").value,
    Problem: $("problem").value,
    ProductURL: $("productUrl").value || "Not provided",
    Plan: $("plan").value
  };
  const subject = encodeURIComponent(`1688 Copilot Early Access — ${fields.Plan}`);
  const body = encodeURIComponent(`Hello PassionGrow,\n\nI want to join the 1688 Copilot private pilot.\n\nEmail: ${fields.Email}\nWhere I sell: ${fields.Channel}\nSourcing frequency: ${fields.Frequency}\nBiggest problem: ${fields.Problem}\nPreferred plan: ${fields.Plan}\n1688 link: ${fields.ProductURL}\n\nPlease send me the free first product analysis.`);
  window.location.href=`mailto:passiongrow88@gmail.com?subject=${subject}&body=${body}`;
});
