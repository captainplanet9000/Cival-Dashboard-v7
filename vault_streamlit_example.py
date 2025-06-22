import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime, timedelta

# Page configuration
st.set_page_config(
    page_title="Vault Banking Dashboard",
    page_icon="🏦",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS for better styling
st.markdown("""
<style>
    .metric-container {
        background-color: #f8f9fa;
        padding: 1rem;
        border-radius: 0.5rem;
        border-left: 4px solid #007bff;
    }
    .vault-card {
        background-color: white;
        padding: 1.5rem;
        border-radius: 0.5rem;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        border: 1px solid #e9ecef;
    }
</style>
""", unsafe_allow_html=True)

# Sidebar
with st.sidebar:
    st.title("🏦 Vault Banking")
    st.markdown("---")
    
    # Vault selector
    selected_vault = st.selectbox(
        "Select Vault",
        ["Master Trading Vault", "Algorithmic Trading", "DeFi Operations", "Risk Hedging", "Emergency Reserve"]
    )
    
    # Quick actions
    st.markdown("### Quick Actions")
    if st.button("💸 Transfer Funds", use_container_width=True):
        st.success("Transfer initiated")
    if st.button("📥 Deposit", use_container_width=True):
        st.success("Deposit confirmed")
    if st.button("📊 DeFi Yield", use_container_width=True):
        st.info("DeFi dashboard opened")

# Main dashboard
st.title("Vault Banking Dashboard")
st.markdown("Multi-account management with hierarchical structure and DeFi integration")

# Compliance Alert
if st.session_state.get('show_compliance_alert', True):
    alert_col1, alert_col2 = st.columns([4, 1])
    with alert_col1:
        st.warning("⚠️ **Compliance Action Required** - 2 compliance actions require immediate attention.")
    with alert_col2:
        if st.button("Dismiss"):
            st.session_state.show_compliance_alert = False
            st.rerun()

# Master Vault Overview
st.markdown("## Master Vault Overview")

col1, col2, col3, col4 = st.columns(4)

with col1:
    st.metric(
        label="💰 Total Balance",
        value="$1,258,473",
        delta="2.1%"
    )

with col2:
    st.metric(
        label="🎯 Allocated",
        value="$987,654",
        delta="-0.5%",
        delta_color="inverse"
    )

with col3:
    st.metric(
        label="💳 Available",
        value="$270,819",
        delta="8.2%"
    )

with col4:
    st.metric(
        label="📊 Sub-Vaults",
        value="5",
        delta="1"
    )

# Allocation Progress
st.markdown("### Capital Allocation")
progress_value = 987654 / 1258473
st.progress(progress_value)
st.caption(f"Allocated: {progress_value:.1%} of total balance")

# Sub-Vaults Portfolio
st.markdown("## Sub-Vault Portfolio")

vault_data = {
    "Vault": ["Algorithmic Trading", "DeFi Operations", "Risk Hedging", "Emergency Reserve", "Research & Development"],
    "Balance": [425847.50, 287954.12, 156234.89, 89876.54, 97741.32],
    "Available": [27596.75, 12273.67, 10344.66, 89876.54, 10282.43],
    "Performance": [8.45, 12.34, 3.67, 1.25, 15.67],
    "Risk": ["Medium", "High", "Low", "Minimal", "Medium"],
    "Status": ["Active", "Active", "Active", "Locked", "Active"]
}

df_vaults = pd.DataFrame(vault_data)

# Display vault cards in grid
vault_cols = st.columns(3)
for idx, (_, vault) in enumerate(df_vaults.iterrows()):
    with vault_cols[idx % 3]:
        with st.container():
            st.markdown(f"""
            <div class="vault-card">
                <h4>{vault['Vault']}</h4>
                <p><strong>Balance:</strong> ${vault['Balance']:,.0f}</p>
                <p><strong>Available:</strong> ${vault['Available']:,.0f}</p>
                <p><strong>Performance:</strong> {vault['Performance']:.2f}%</p>
                <p><strong>Risk:</strong> {vault['Risk']}</p>
                <p><strong>Status:</strong> {vault['Status']}</p>
            </div>
            """, unsafe_allow_html=True)

# Charts Section
chart_col1, chart_col2 = st.columns(2)

with chart_col1:
    st.markdown("### Portfolio Allocation")
    fig_pie = px.pie(
        df_vaults, 
        values='Balance', 
        names='Vault',
        title="Vault Distribution by Balance",
        color_discrete_sequence=px.colors.qualitative.Set3
    )
    fig_pie.update_traces(textposition='inside', textinfo='percent+label')
    st.plotly_chart(fig_pie, use_container_width=True)

with chart_col2:
    st.markdown("### Performance Overview")
    fig_bar = px.bar(
        df_vaults,
        x='Vault',
        y='Performance',
        title="Performance by Vault (%)",
        color='Performance',
        color_continuous_scale='RdYlGn'
    )
    fig_bar.update_xaxes(tickangle=45)
    st.plotly_chart(fig_bar, use_container_width=True)

# Recent Transactions
st.markdown("## Recent Transactions")

transaction_data = {
    "Type": ["Transfer", "Yield", "Deposit", "Withdrawal"],
    "From": ["Master Trading Vault", "DeFi Operations", "External Bank", "Risk Hedging"],
    "To": ["Algorithmic Trading", "Master Trading Vault", "Master Trading Vault", "External Account"],
    "Amount": [50000.00, 1234.56, 100000.00, 25000.00],
    "Status": ["Completed", "Completed", "Pending", "Completed"],
    "Time": ["10:45:23", "09:30:15", "08:15:42", "16:22:18"],
    "Reference": ["TXN-ALG-001", "YLD-DEFI-789", "DEP-EXT-456", "WTH-HDG-123"]
}

df_transactions = pd.DataFrame(transaction_data)

# Style the dataframe
def style_status(val):
    if val == "Completed":
        return "background-color: #d4edda; color: #155724"
    elif val == "Pending":
        return "background-color: #fff3cd; color: #856404"
    else:
        return ""

styled_df = df_transactions.style.applymap(style_status, subset=['Status'])
st.dataframe(styled_df, use_container_width=True)

# DeFi Protocol Status
st.markdown("## DeFi Protocol Status")

defi_col1, defi_col2, defi_col3 = st.columns(3)

with defi_col1:
    st.markdown("#### Uniswap V3")
    st.metric("TVL", "$145,820", "↗")
    st.metric("APY", "18.45%", "2.3%")
    st.caption("Risk Score: 7/10")

with defi_col2:
    st.markdown("#### Aave")
    st.metric("TVL", "$89,650", "↗")
    st.metric("APY", "8.25%", "0.8%")
    st.caption("Risk Score: 4/10")

with defi_col3:
    st.markdown("#### Compound")
    st.metric("TVL", "$52,484", "→")
    st.metric("APY", "6.75%", "-0.2%")
    st.caption("Risk Score: 3/10")

# Compliance Section
st.markdown("## Compliance & Security")

compliance_col1, compliance_col2 = st.columns(2)

with compliance_col1:
    st.markdown("### Compliance Scores")
    compliance_data = {
        "Metric": ["Overall Score", "KYC Compliance", "AML Compliance", "Regulatory", "Risk Assessment"],
        "Score": [98, 100, 95, 99, 92]
    }
    
    for metric, score in zip(compliance_data["Metric"], compliance_data["Score"]):
        st.metric(metric, f"{score}%")

with compliance_col2:
    st.markdown("### Audit Information")
    st.info("**Last Audit:** 2024-01-10 (Score: 96%)")
    st.info("**Next Audit:** 2024-04-10")
    
    if st.button("View Audit Trail"):
        st.success("Audit trail opened")

# Footer
st.markdown("---")
st.caption("Built with ❤️ using Streamlit • Real-time updates every 30 seconds")

# Auto-refresh every 30 seconds
if st.checkbox("Enable auto-refresh"):
    import time
    time.sleep(30)
    st.rerun() 