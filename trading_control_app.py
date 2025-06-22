import flet as ft
import asyncio
import aiohttp
import json
from datetime import datetime

class TradingControlApp:
    def __init__(self, page: ft.Page):
        self.page = page
        self.page.title = "🏦 Trading Dashboard Control"
        self.page.theme_mode = ft.ThemeMode.DARK
        self.page.bgcolor = ft.colors.BLUE_GREY_900
        self.api_base = "http://localhost:8000"  # Your FastAPI backend
        
        # State variables
        self.auto_trading = True
        self.risk_level = 25.0
        self.vault_balance = 1258473.25
        self.allocated_amount = 987654.32
        
        # UI References
        self.balance_text = None
        self.allocated_text = None
        self.progress_bar = None
        self.auto_trading_switch = None
        self.risk_slider = None
        
    async def call_api(self, endpoint, data=None, method="POST"):
        """Call the FastAPI backend"""
        try:
            async with aiohttp.ClientSession() as session:
                if method == "GET":
                    async with session.get(f"{self.api_base}{endpoint}") as response:
                        return await response.json()
                else:
                    async with session.post(f"{self.api_base}{endpoint}", 
                                          json=data, 
                                          headers={'Content-Type': 'application/json'}) as response:
                        return await response.json()
        except Exception as e:
            self.show_snackbar(f"API Error: {str(e)}", ft.colors.RED)
            return None
    
    def show_snackbar(self, message, color=ft.colors.GREEN):
        """Show notification"""
        self.page.show_snack_bar(
            ft.SnackBar(
                content=ft.Text(message, color=ft.colors.WHITE),
                bgcolor=color
            )
        )
        
    def create_vault_controls(self):
        """Create vault management interface"""
        
        # Master Vault Status Card
        vault_card = ft.Card(
            content=ft.Container(
                content=ft.Column([
                    ft.Row([
                        ft.Icon(ft.icons.ACCOUNT_BALANCE, color=ft.colors.BLUE_400),
                        ft.Text("Master Trading Vault", 
                               size=20, 
                               weight=ft.FontWeight.BOLD,
                               color=ft.colors.WHITE)
                    ]),
                    ft.Divider(color=ft.colors.BLUE_GREY_700),
                    
                    # Balance Display
                    ft.Row([
                                                ft.Column([                            ft.Text("Total Balance",                                    size=14,                                    color=ft.colors.BLUE_GREY_400),                            ft.Text(                                f"${self.vault_balance:,.2f}",                                 size=24,                                 weight=ft.FontWeight.BOLD,                                color=ft.colors.GREEN_400                            )                        ], expand=True),                        ft.Column([                            ft.Text("Allocated",                                    size=14,                                    color=ft.colors.BLUE_GREY_400),                            ft.Text(                                f"${self.allocated_amount:,.2f}",                                 size=18,                                 weight=ft.FontWeight.W_500,                                color=ft.colors.ORANGE_400                            )                        ], expand=True)
                    ]),
                    
                    # Progress Bar
                    ft.Column([
                        ft.Row([
                            ft.Text("Capital Allocation", 
                                   size=14, 
                                   color=ft.colors.BLUE_GREY_400),
                            ft.Text(f"{(self.allocated_amount/self.vault_balance)*100:.1f}%", 
                                   size=14, 
                                   color=ft.colors.WHITE)
                        ], alignment=ft.MainAxisAlignment.SPACE_BETWEEN),
                        self.progress_bar := ft.ProgressBar(
                            value=(self.allocated_amount/self.vault_balance),
                            color=ft.colors.BLUE_400,
                            bgcolor=ft.colors.BLUE_GREY_800
                        )
                    ]),
                    
                    # Action Buttons
                    ft.Row([
                        ft.ElevatedButton(
                            text="Transfer Funds",
                            icon=ft.icons.SWAP_HORIZ,
                            bgcolor=ft.colors.BLUE_600,
                            color=ft.colors.WHITE,
                            on_click=self.show_transfer_dialog,
                            expand=True
                        ),
                        ft.ElevatedButton(
                            text="Emergency Stop",
                            icon=ft.icons.STOP_CIRCLE,
                            bgcolor=ft.colors.RED_600,
                            color=ft.colors.WHITE,
                            on_click=self.emergency_stop,
                            expand=True
                        )
                    ], spacing=10)
                ], spacing=15),
                padding=20,
                bgcolor=ft.colors.BLUE_GREY_800,
                border_radius=10
            )
        )
        
        # Sub-Vaults Status
        subvaults_card = ft.Card(
            content=ft.Container(
                content=ft.Column([
                    ft.Text("Sub-Vaults Status", 
                           size=18, 
                           weight=ft.FontWeight.BOLD,
                           color=ft.colors.WHITE),
                    ft.Divider(color=ft.colors.BLUE_GREY_700),
                    
                    # Vault Status Items
                    self.create_vault_status_item("Algorithmic Trading", 425847.50, "Active", ft.colors.GREEN),
                    self.create_vault_status_item("DeFi Operations", 287954.12, "Active", ft.colors.GREEN),
                    self.create_vault_status_item("Risk Hedging", 156234.89, "Active", ft.colors.GREEN),
                    self.create_vault_status_item("Emergency Reserve", 89876.54, "Locked", ft.colors.ORANGE),
                    
                    ft.ElevatedButton(
                        text="View All Vaults",
                        icon=ft.icons.VISIBILITY,
                        bgcolor=ft.colors.BLUE_GREY_700,
                        color=ft.colors.WHITE,
                        on_click=lambda _: self.show_snackbar("Opening vault details..."),
                        width=200
                    )
                ], spacing=10),
                padding=20,
                bgcolor=ft.colors.BLUE_GREY_800,
                border_radius=10
            )
        )
        
        return ft.Column([vault_card, subvaults_card], spacing=20)
    
    def create_vault_status_item(self, name, balance, status, status_color):
        """Create a vault status row"""
        return ft.Row([
            ft.Icon(ft.icons.ACCOUNT_BALANCE_WALLET, 
                   size=20, 
                   color=ft.colors.BLUE_400),
            ft.Column([
                ft.Text(name, size=14, weight=ft.FontWeight.W_500, color=ft.colors.WHITE),
                ft.Text(f"${balance:,.2f}", size=12, color=ft.colors.BLUE_GREY_400)
            ], expand=True, spacing=2),
            ft.Container(
                content=ft.Text(status, size=12, color=ft.colors.WHITE),
                bgcolor=status_color,
                padding=ft.padding.symmetric(horizontal=8, vertical=4),
                border_radius=5
            )
        ], alignment=ft.MainAxisAlignment.SPACE_BETWEEN)
    
    def create_trading_controls(self):
        """Create trading management interface"""
        
        trading_card = ft.Card(
            content=ft.Container(
                content=ft.Column([
                    ft.Row([
                        ft.Icon(ft.icons.TRENDING_UP, color=ft.colors.GREEN_400),
                        ft.Text("Trading Controls", 
                               size=20, 
                               weight=ft.FontWeight.BOLD,
                               color=ft.colors.WHITE)
                    ]),
                    ft.Divider(color=ft.colors.BLUE_GREY_700),
                    
                    # Auto Trading Toggle
                    ft.Row([
                        ft.Icon(ft.icons.SMART_TOY, color=ft.colors.BLUE_400),
                        ft.Text("Automated Trading", 
                               size=16, 
                               color=ft.colors.WHITE),
                        self.auto_trading_switch := ft.Switch(
                            value=self.auto_trading,
                            active_color=ft.colors.GREEN_400,
                            on_change=self.toggle_auto_trading
                        )
                    ], alignment=ft.MainAxisAlignment.SPACE_BETWEEN),
                    
                    # Risk Level Slider
                    ft.Column([
                        ft.Row([
                            ft.Text("Risk Level", size=16, color=ft.colors.WHITE),
                            ft.Text(f"{self.risk_level:.0f}%", 
                                   size=16, 
                                   weight=ft.FontWeight.BOLD,
                                   color=self.get_risk_color(self.risk_level))
                        ], alignment=ft.MainAxisAlignment.SPACE_BETWEEN),
                        self.risk_slider := ft.Slider(
                            min=0,
                            max=100,
                            value=self.risk_level,
                            divisions=20,
                            active_color=ft.colors.ORANGE_400,
                            inactive_color=ft.colors.BLUE_GREY_700,
                            on_change=self.update_risk_level
                        )
                    ]),
                    
                    # Quick Actions
                    ft.Row([
                        ft.ElevatedButton(
                            text="Pause All",
                            icon=ft.icons.PAUSE,
                            bgcolor=ft.colors.ORANGE_600,
                            color=ft.colors.WHITE,
                            on_click=self.pause_all_trading,
                            expand=True
                        ),
                        ft.ElevatedButton(
                            text="Resume All",
                            icon=ft.icons.PLAY_ARROW,
                            bgcolor=ft.colors.GREEN_600,
                            color=ft.colors.WHITE,
                            on_click=self.resume_all_trading,
                            expand=True
                        )
                    ], spacing=10)
                    
                ], spacing=20),
                padding=20,
                bgcolor=ft.colors.BLUE_GREY_800,
                border_radius=10
            )
        )
        
        # Performance Metrics
        metrics_card = ft.Card(
            content=ft.Container(
                content=ft.Column([
                    ft.Text("Performance Metrics", 
                           size=18, 
                           weight=ft.FontWeight.BOLD,
                           color=ft.colors.WHITE),
                    ft.Divider(color=ft.colors.BLUE_GREY_700),
                    
                    ft.Row([
                        self.create_metric_item("Daily P&L", "+$1,234.56", ft.colors.GREEN_400),
                        self.create_metric_item("Win Rate", "78.5%", ft.colors.BLUE_400)
                    ]),
                    ft.Row([
                        self.create_metric_item("Active Positions", "12", ft.colors.ORANGE_400),
                        self.create_metric_item("Total Trades", "156", ft.colors.PURPLE_400)
                    ])
                ], spacing=15),
                padding=20,
                bgcolor=ft.colors.BLUE_GREY_800,
                border_radius=10
            )
        )
        
        return ft.Column([trading_card, metrics_card], spacing=20)
    
    def create_metric_item(self, label, value, color):
        """Create a metric display item"""
        return ft.Column([
            ft.Text(label, size=12, color=ft.colors.BLUE_GREY_400),
            ft.Text(value, size=18, weight=ft.FontWeight.BOLD, color=color)
        ], expand=True, horizontal_alignment=ft.CrossAxisAlignment.CENTER)
    
    def create_alerts_panel(self):
        """Create alerts and notifications interface"""
        
        alerts_card = ft.Card(
            content=ft.Container(
                content=ft.Column([
                    ft.Row([
                        ft.Icon(ft.icons.NOTIFICATIONS, color=ft.colors.ORANGE_400),
                        ft.Text("Active Alerts", 
                               size=20, 
                               weight=ft.FontWeight.BOLD,
                               color=ft.colors.WHITE)
                    ]),
                    ft.Divider(color=ft.colors.BLUE_GREY_700),
                    
                    # Alert Items
                    self.create_alert_item("Compliance Action Required", 
                                         "2 compliance actions need attention", 
                                         ft.colors.ORANGE_400,
                                         "2 min ago"),
                    self.create_alert_item("High Risk Position", 
                                         "DeFi vault exceeds risk threshold", 
                                         ft.colors.RED_400,
                                         "5 min ago"),
                    self.create_alert_item("Transfer Completed", 
                                         "Successfully moved $50K to Algo vault", 
                                         ft.colors.GREEN_400,
                                         "10 min ago"),
                    
                    ft.ElevatedButton(
                        text="Clear All Alerts",
                        icon=ft.icons.CLEAR_ALL,
                        bgcolor=ft.colors.BLUE_GREY_700,
                        color=ft.colors.WHITE,
                        on_click=lambda _: self.show_snackbar("All alerts cleared"),
                        width=200
                    )
                ], spacing=15),
                padding=20,
                bgcolor=ft.colors.BLUE_GREY_800,
                border_radius=10
            )
        )
        
        return alerts_card
    
    def create_alert_item(self, title, description, color, time):
        """Create an alert item"""
        return ft.Container(
            content=ft.Row([
                ft.Icon(ft.icons.CIRCLE, size=12, color=color),
                ft.Column([
                    ft.Text(title, size=14, weight=ft.FontWeight.W_500, color=ft.colors.WHITE),
                    ft.Text(description, size=12, color=ft.colors.BLUE_GREY_400)
                ], expand=True, spacing=2),
                ft.Text(time, size=12, color=ft.colors.BLUE_GREY_500)
            ]),
            padding=10,
            bgcolor=ft.colors.BLUE_GREY_900,
            border_radius=5,
            border=ft.border.all(1, ft.colors.BLUE_GREY_700)
        )
    
    def get_risk_color(self, risk_level):
        """Get color based on risk level"""
        if risk_level < 25:
            return ft.colors.GREEN_400
        elif risk_level < 50:
            return ft.colors.YELLOW_400
        elif risk_level < 75:
            return ft.colors.ORANGE_400
        else:
            return ft.colors.RED_400
    
    # Event Handlers
    async def show_transfer_dialog(self, e):
        """Show fund transfer dialog"""
        def close_dialog(e):
            dialog.open = False
            self.page.update()
        
        async def transfer_funds(e):
            amount = float(amount_field.value or 0)
            from_vault = from_dropdown.value
            to_vault = to_dropdown.value
            
            if amount > 0 and from_vault and to_vault:
                result = await self.call_api('/api/vault/transfer', {
                    'from_vault': from_vault,
                    'to_vault': to_vault,
                    'amount': amount
                })
                
                if result:
                    self.show_snackbar(f"Transferred ${amount:,.2f} from {from_vault} to {to_vault}")
                    close_dialog(e)
                else:
                    self.show_snackbar("Transfer failed", ft.colors.RED)
            else:
                self.show_snackbar("Please fill all fields", ft.colors.ORANGE)
        
        amount_field = ft.TextField(label="Amount ($)", width=200)
        from_dropdown = ft.Dropdown(
            label="From Vault",
            options=[
                ft.dropdown.Option("master", "Master Vault"),
                ft.dropdown.Option("algo", "Algorithmic Trading"),
                ft.dropdown.Option("defi", "DeFi Operations"),
            ],
            width=200
        )
        to_dropdown = ft.Dropdown(
            label="To Vault",
            options=[
                ft.dropdown.Option("algo", "Algorithmic Trading"),
                ft.dropdown.Option("defi", "DeFi Operations"),
                ft.dropdown.Option("hedge", "Risk Hedging"),
            ],
            width=200
        )
        
        dialog = ft.AlertDialog(
            modal=True,
            title=ft.Text("Transfer Funds"),
            content=ft.Column([
                amount_field,
                from_dropdown,
                to_dropdown
            ], spacing=20, tight=True),
            actions=[
                ft.TextButton("Cancel", on_click=close_dialog),
                ft.ElevatedButton("Transfer", on_click=transfer_funds)
            ]
        )
        
        self.page.dialog = dialog
        dialog.open = True
        self.page.update()
    
    async def emergency_stop(self, e):
        """Emergency stop all trading"""
        result = await self.call_api('/api/trading/emergency-stop')
        if result:
            self.show_snackbar("EMERGENCY STOP ACTIVATED!", ft.colors.RED)
            self.auto_trading_switch.value = False
            self.page.update()
    
    async def toggle_auto_trading(self, e):
        """Toggle automated trading"""
        self.auto_trading = e.control.value
        result = await self.call_api('/api/trading/auto-toggle', {
            'enabled': self.auto_trading
        })
        
        status = "enabled" if self.auto_trading else "disabled"
        self.show_snackbar(f"Auto trading {status}")
    
    async def update_risk_level(self, e):
        """Update risk level"""
        self.risk_level = e.control.value
        result = await self.call_api('/api/trading/risk-level', {
            'level': self.risk_level
        })
        
        # Update risk level display color
        risk_text = self.page.controls[1].content.tabs[1].content.controls[0].content.content.controls[2].controls[0].controls[1]
        risk_text.color = self.get_risk_color(self.risk_level)
        risk_text.value = f"{self.risk_level:.0f}%"
        self.page.update()
    
    async def pause_all_trading(self, e):
        """Pause all trading activities"""
        result = await self.call_api('/api/trading/pause-all')
        if result:
            self.show_snackbar("All trading paused", ft.colors.ORANGE)
    
    async def resume_all_trading(self, e):
        """Resume all trading activities"""
        result = await self.call_api('/api/trading/resume-all')
        if result:
            self.show_snackbar("All trading resumed", ft.colors.GREEN)
    
    def main(self):
        """Main app setup"""
        # App Bar
        self.page.appbar = ft.AppBar(
            title=ft.Text("🏦 Trading Control", color=ft.colors.WHITE),
            bgcolor=ft.colors.BLUE_GREY_800,
            actions=[
                ft.IconButton(
                    ft.icons.REFRESH,
                    on_click=lambda _: self.show_snackbar("Refreshing data..."),
                    tooltip="Refresh"
                ),
                ft.IconButton(
                    ft.icons.SETTINGS,
                    on_click=lambda _: self.show_snackbar("Opening settings..."),
                    tooltip="Settings"
                )
            ]
        )
        
        # Create tabs
        tabs = ft.Tabs(
            selected_index=0,
            animation_duration=300,
            tabs=[
                ft.Tab(
                    text="Vaults",
                    icon=ft.icons.ACCOUNT_BALANCE,
                    content=ft.Container(
                        content=self.create_vault_controls(),
                        padding=20
                    )
                ),
                ft.Tab(
                    text="Trading",
                    icon=ft.icons.TRENDING_UP,
                    content=ft.Container(
                        content=self.create_trading_controls(),
                        padding=20
                    )
                ),
                ft.Tab(
                    text="Alerts",
                    icon=ft.icons.NOTIFICATIONS,
                    content=ft.Container(
                        content=self.create_alerts_panel(),
                        padding=20
                    )
                )
            ],
            expand=1
        )
        
        self.page.add(tabs)

def main(page: ft.Page):
    app = TradingControlApp(page)
    app.main()

if __name__ == "__main__":
    # Run as desktop app
    ft.app(target=main, name="Trading Control")
    
    # To run as mobile app, use:
    # ft.app(target=main, view=ft.AppView.FLET_APP)
    
    # To run as web app, use:
    # ft.app(target=main, view=ft.AppView.WEB_BROWSER, port=8080) 