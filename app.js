const $ = (id) => document.getElementById(id);
const inputs = ["unitRmb","weightKg","shipRate","sellPrice","platformFee","fxRate"];
const capture = (event, properties = {}) => { try { window.posthog?.capture?.(event, properties); } catch (_) {} };
function money(n){return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(Number.isFinite(n)?n:0)}
let calculatorTracked = false;
function calculate(){
  const unitRmb = Number($("unitRmb").value || 0);
  const weight = Number($("weightKg").value || 0);
  const shippingRate = Number($("shipRate").value || 0);
  const selling = Number($("sellPrice").value || 0);
  const feePct = Number($("platformFee").value || 0) / 100;
  const fx = Math.max(Number($("fxRate").value || 1), .01);
  const landed = unitRmb / fx + weight * shippingRate + selling * feePct;
  const profit = selling - landed;
  const margin = selling > 0 ? profit / selling : 0;
  $("landedCost").textContent = money(landed);
  $("grossProfit").textContent = money(profit);
  $("grossMargin").textContent = `${Math.round(margin*100)}%`;
  const signal = $("marginSignal");
  if(margin >= .35){signal.textContent="Healthy first-pass margin — worth supplier validation.";signal.style.background="#edf7f2";signal.style.color="#0a8f5b"}
  else if(margin >= .2){signal.textContent="Borderline margin — negotiate cost or validate freight.";signal.style.background="#fff7dd";signal.style.color="#8d6200"}
  else{signal.textContent="High-risk margin — probably not worth sampling yet.";signal.style.background="#fff0f0";signal.style.color="#b53131"}
  return {landed, profit, margin};
}
inputs.forEach(id => $(id)?.addEventListener("input", () => { const result = calculate(); if(!calculatorTracked){ calculatorTracked = true; capture("calculator_used", {first_input:id, margin_percent:Math.round(result.margin*100)}); } }));
calculate();
$("loadSample")?.addEventListener("click",()=>{ $("sampleTitle").textContent="Foldable magnetic phone stand"; $("unitRmb").value="18.5"; $("weightKg").value="0.32"; $("shipRate").value="8.2"; $("sellPrice").value="19.99"; $("platformFee").value="15"; $("fxRate").value="7.2"; const result = calculate(); capture("calculator_sample_loaded", {margin_percent:Math.round(result.margin*100)}); document.querySelector(".app-card").scrollIntoView({behavior:"smooth",block:"center"}); });
document.querySelectorAll(".price-card").forEach(card=>card.addEventListener("click",()=>{ document.querySelectorAll(".price-card").forEach(c=>c.classList.remove("selected")); card.classList.add("selected"); const plan = card.dataset.plan; capture("pricing_plan_selected", {plan}); document.getElementById(plan && plan.includes("Setup Pack") ? "payment-options" : "early-access").scrollIntoView({behavior:"smooth"}); }));
document.querySelectorAll(".application-link").forEach(link => link.addEventListener("click", () => { const url = new URL(link.href); try { const distinctId = window.posthog?.get_distinct_id?.(); if(distinctId) url.searchParams.set("distinct_id", distinctId); } catch (_) {} const pageParams = new URLSearchParams(window.location.search); ["utm_source","utm_medium","utm_campaign","utm_content"].forEach(key => { const value = pageParams.get(key); if(value) url.searchParams.set(key, value); }); link.href = url.toString(); capture("pilot_application_clicked", {location: link.textContent.trim()}); }));
document.querySelectorAll(".payment-link").forEach(link => link.addEventListener("click", () => { capture("payment_link_clicked", {offer:link.dataset.offer, amount_usd:Number(link.dataset.amount), destination:"stripe"}); }));
