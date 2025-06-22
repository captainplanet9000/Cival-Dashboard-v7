# Conceptual Test Run: Trading Analysis Crew

## 1. Objective

To trace a sample request through the `TradingCrewService` and the `trading_analysis_crew`, highlighting expected data transformations, tool interactions, and Large Language Model (LLM) reasoning and output at each step. This document assumes live LLMs are being used and that the defined tools are functional (even if their underlying actions are stubbed for now). This serves as a "mental model" or a blueprint for debugging and verifying live crew execution.

## 2. Sample Request to `/api/v1/crews/trading/analyze`

The following JSON payload is sent to the FastAPI endpoint:

```json
{
    "symbol": "BTC-USD",
    "timeframe": "4h",
    "strategy_name": "DarvasBoxStrategy",
    "llm_config_id": "default_openai_gpt4"
}
```
*(Note: `strategy_name` was "DarvasBox" in the prompt, but the tool is `apply_darvas_box_tool` and the task description uses `{strategy_name}`, so "DarvasBoxStrategy" is a plausible value passed to the task.)*

## 3. Flow Through `TradingCrewService`

1.  The `TradingCrewService.run_analysis` method receives the `TradingCrewRequest`.
2.  It conceptually loads an `LLMConfig` based on `llm_config_id="default_openai_gpt4"`. This configuration might specify using "gpt-4-turbo" with certain parameters (e.g., temperature 0.7).
3.  An LLM instance (e.g., `ChatOpenAI(model="gpt-4-turbo", temperature=0.7, api_key=...)`) is created using this configuration.
4.  The `market_analyst_agent`, `strategy_agent`, and `trade_advisor_agent` are deep-copied, and their `llm` attribute is set to this newly instantiated LLM.
5.  A new `Crew` instance is created with these runtime agents and the predefined tasks.
6.  The inputs for `crew.kickoff_async()` are prepared:
    ```python
    inputs = {
        "symbol": "BTC-USD",
        "timeframe": "4h",
        "strategy_name": "DarvasBoxStrategy"
    }
    ```
7.  The crew execution begins.

## 4. Task 1: `market_analysis_task` (Executed by `MarketAnalystAgent`)

*   **Agent's Goal (Refined):** "Analyze market conditions for BTC-USD over 4h, using available tools to fetch data and perform technical analysis. Synthesize findings into a structured `MarketAnalysis` object."
*   **Task Description (Interpolated):** "Analyze the market conditions for symbol 'BTC-USD' over the '4h'. Utilize available tools to fetch necessary market data and perform technical analysis. Focus on identifying the current trend, volatility, key support and resistance levels, and summarizing relevant technical indicator values. Consider recent news or sentiment if data is available through your tools. Your final output must be a detailed analysis."
*   **Expected Tool Usage:**
    1.  **`fetch_market_data_tool` Call:**
        *   Agent decides to call `fetch_market_data_tool` with inferred or default arguments. Based on task, likely: `symbol="BTC-USD"`, `timeframe="4h"`, `historical_days=30` (default).
        *   **Tool Output (JSON string, example from stub):**
            ```json
            {
                "symbol": "BTC-USD",
                "timeframe": "4h",
                "requested_historical_days": 30,
                "limit_calculated": 180, // 30 days * (24/4) candles
                "data_source_status": "Used mock data...",
                "data_points_returned": 180,
                "current_price_simulated": 29850.75,
                "data": [
                    {"timestamp": "...", "symbol": "BTC-USD", "open": ..., "high": ..., "low": ..., "close": ..., "volume": ...},
                    // ...179 more records...
                ]
            }
            ```
    2.  **`run_technical_analysis_tool` Call:**
        *   Agent calls `run_technical_analysis_tool` with `market_data_json` being the output from `fetch_market_data_tool`, and `volume_sma_period=20` (default).
        *   **Tool Output (JSON string, example from stub):**
            ```json
            {
                "symbol": "BTC-USD",
                "timeframe": "4h",
                "summary": "Technical analysis complete for BTC-USD. DataFrame includes 180 records with calculated Volume SMA.",
                "ohlcv_with_ta": [
                    {"timestamp": "...", "open": ..., "close": ..., "volume": ..., "volume_sma": ...},
                    // ...179 more records with 'volume_sma'
                ],
                "columns_available": ["timestamp", "open", "high", "low", "close", "volume", "volume_sma"]
            }
            ```
*   **LLM Interaction (Conceptual):**
    *   **Input to LLM:** Agent's system prompt, refined task description for `market_analysis_task`, and the JSON string outputs from both `fetch_market_data_tool` and `run_technical_analysis_tool`.
    *   **Expected LLM Reasoning:** The LLM processes the provided data. It looks at the OHLCV data, the calculated Volume SMA (from `ohlcv_with_ta`), and the summary from the TA tool. It then synthesizes this information to determine overall market condition, trend, support/resistance (conceptually, as the TA tool stub doesn't provide these robustly yet), etc.
    *   **Expected LLM Output (JSON string conforming to `MarketAnalysis`):**
        ```json
        {
            "symbol": "BTC-USD",
            "timeframe": "4h",
            "market_condition": "NEUTRAL_TO_SLIGHTLY_BULLISH",
            "trend_direction": "SIDEWAYS_WITH_UPWARD_BIAS",
            "trend_strength": 0.55,
            "volatility_score": 0.6,
            "support_levels": [29500.0, 29000.0],
            "resistance_levels": [30500.0, 31000.0],
            "indicators": {
                "volume_sma_20_avg": 1500.0, // Example, LLM might summarize from TA tool output
                "RSI_14": 55.0 // Conceptual if TA tool provided it
            },
            "sentiment_score": 0.1, // Neutral
            "news_impact_summary": "No major market-moving news identified by tools for BTC-USD in the last 4h.",
            "short_term_forecast": "Price likely to consolidate around $30,000. A breakout above $30,500 could indicate further upside."
        }
        ```
*   **Task Output:** The LLM's JSON string output is parsed by CrewAI into a `MarketAnalysis` Pydantic object (or a dictionary if Pydantic parsing fails).

## 5. Task 2: `strategy_application_task` (Executed by `StrategyAgent`)

*   **Agent's Goal (Refined):** "Apply the 'DarvasBoxStrategy' trading strategy to the provided market analysis for BTC-USD. Utilize strategy-specific tools and logic to determine a trading action, confidence, and key trade parameters. Format your output as a `StrategyApplicationResult` object."
*   **Input from Context:** The `MarketAnalysis` object/dict from `market_analysis_task`.
*   **Task Description (Interpolated):** "Given the market analysis for 'BTC-USD', apply the 'DarvasBoxStrategy' trading strategy. Use the appropriate tool to execute the strategy's logic based on the analysis. Determine a trading action (BUY, SELL, or HOLD), a confidence score for this advice, and if applicable, calculate target price, stop-loss, and take-profit levels based strictly on the rules of the 'DarvasBoxStrategy' strategy. Provide a clear rationale for your advice. Your final output must be a detailed strategy application result."
*   **Expected Tool Usage:**
    1.  **`apply_darvas_box_tool` Call:**
        *   Agent calls `apply_darvas_box_tool`.
        *   `processed_market_data_json`: This should be the JSON string that was originally fetched by `fetch_market_data_tool` (or the one output by `run_technical_analysis_tool` if it contains *all* original OHLCV fields needed by `run_darvas_box`). The current `apply_darvas_box_tool` expects the output of `run_technical_analysis_tool` and processes its `ohlcv_with_ta` field.
        *   `darvas_config`: A dictionary with default Darvas Box parameters, e.g., `{"lookback_period_highs": 50, "min_box_duration": 3, ...}`.
        *   **Tool Output (JSON string of `StrategyApplicationResult`, example from stub):**
            ```json
            {
                "symbol": "BTC-USD",
                "strategy_name": "DarvasBoxStrategy",
                "advice": "BUY", // Assuming Darvas conditions were met in the (mocked) run_darvas_box
                "confidence_score": 0.70,
                "target_price": 31000.0,
                "stop_loss": 29800.0,
                "take_profit": 31500.0,
                "rationale": "Darvas Box strategy generated a BUY signal for BTC-USD...",
                "additional_data": {"boxes_found": [{"top": ..., "bottom": ...}]},
                "timestamp": "..."
            }
            ```
*   **LLM Interaction (Conceptual):**
    *   **Input to LLM:** Agent's system prompt, task description, `MarketAnalysis` object (from context), and the JSON string output from `apply_darvas_box_tool`.
    *   **Expected LLM Reasoning:** The LLM primarily reviews the output from `apply_darvas_box_tool`. Since this tool already produces a `StrategyApplicationResult`, the LLM's main job here might be to ensure the rationale is well-phrased, the confidence score is sensible in light of the market analysis, or to simply pass through the structured output if it's deemed complete. It ensures the output strictly adheres to the `StrategyApplicationResult` schema.
    *   **Expected LLM Output (JSON string conforming to `StrategyApplicationResult`):** Likely very similar to the `apply_darvas_box_tool` output.
*   **Task Output:** The LLM's JSON string output is parsed into a `StrategyApplicationResult` Pydantic object.

## 6. Task 3: `trade_decision_task` (Executed by `TradeAdvisorAgent`)

*   **Agent's Goal (Refined):** "Synthesize the market analysis and strategy advice for BTC-USD. Perform a final risk assessment using available tools. Formulate a comprehensive and actionable trading decision, ensuring it's presented as a `TradingDecision` object."
*   **Input from Context:** `MarketAnalysis` object and `StrategyApplicationResult` object.
*   **Task Description (Interpolated):** "Review the provided market analysis and the 'DarvasBoxStrategy' strategy application result for 'BTC-USD'. Conduct a final risk assessment using the `assess_trade_risk_tool` based on the proposed action from the strategy, market context from the analysis, and any available portfolio information. Synthesize all information to formulate a comprehensive trading decision. Your final output must be a complete trading signal."
*   **Expected Tool Usage:**
    1.  **`assess_trade_risk_tool` Call:**
        *   Agent calls `assess_trade_risk_tool` using data from `StrategyApplicationResult` and `MarketAnalysis`.
        *   Example args: `symbol="BTC-USD"`, `proposed_action="BUY"`, `confidence_score=0.70`, `entry_price=...` (current price from market data or suggested by strategy), `stop_loss_price=29800.0`, `take_profit_price=31500.0`, `quantity_or_value=...` (e.g., default 1 unit, or from portfolio context if available), `market_conditions_summary="Market is NEUTRAL_TO_SLIGHTLY_BULLISH..."`.
        *   **Tool Output (JSON string of `TradeRiskAssessmentOutput`, example from stub):**
            ```json
            {
                "risk_level": "MEDIUM",
                "warnings": ["Consider market volatility if applicable."],
                "max_potential_loss_estimate_percent": 1.5, // Example based on entry/stop
                "max_potential_loss_value": 450.0, // Example
                "suggested_position_size_adjustment_factor": 1.0,
                "sanity_checks_passed": true,
                "assessment_summary": "Trade for BTC-USD assessed with MEDIUM risk. Consider market volatility.",
                "timestamp": "..."
            }
            ```
*   **LLM Interaction (Conceptual):**
    *   **Input to LLM:** Agent's system prompt, task description, `MarketAnalysis` object, `StrategyApplicationResult` object, and the JSON string output from `assess_trade_risk_tool`.
    *   **Expected LLM Reasoning:** The LLM synthesizes all inputs. It considers the initial analysis, the strategy's advice, and the risk assessment. It formulates a final, actionable decision, including a comprehensive rationale. It needs to populate all fields of the `TradingDecision` model.
    *   **Expected LLM Output (JSON string conforming to `TradingDecision`):**
        ```json
        {
            "decision_id": "some_unique_uuid",
            "agent_id": "TradeAdvisorAgent_instance_id_or_trading_crew_run_id",
            "symbol": "BTC-USD",
            "action": "BUY",
            "quantity": 1.0, // Default or derived
            "price": 30050.0, // Example entry price, could be current market or from strategy
            "stop_loss": 29800.0,
            "take_profit": 31500.0,
            "confidence": 0.68, // May adjust original confidence based on risk
            "reasoning": "Market analysis shows sideways trend with upward bias. DarvasBoxStrategy signaled BUY at $30050 with SL $29800. Risk assessment is MEDIUM due to general market conditions. Proceeding with buy, adjusted confidence.",
            "timestamp": "YYYY-MM-DDTHH:MM:SSZ",
            "strategy_used": "DarvasBoxStrategy",
            "risk_assessment": { // Embedding the risk output
                "risk_level": "MEDIUM",
                "warnings": ["Consider market volatility if applicable."],
                "max_potential_loss_estimate_percent": 1.5,
                "max_potential_loss_value": 450.0,
                "suggested_position_size_adjustment_factor": 1.0,
                "sanity_checks_passed": true,
                "assessment_summary": "Trade for BTC-USD assessed with MEDIUM risk. Consider market volatility."
            },
            "metadata": {"timeframe": "4h", "analysis_strength": 0.55}
        }
        ```
*   **Task Output (Final Crew Output):** The LLM's JSON string output is parsed by CrewAI into a `TradingDecision` Pydantic object. This is the final result of the `trading_analysis_crew.kickoff_async()`.

## 7. Potential Issues & Debugging during Live LLM Testing

*   **Schema Adherence:** LLMs might not always perfectly adhere to the Pydantic schema in their JSON output, requiring retries, more explicit prompting, or output parsing/correction layers. The `output_pydantic` feature in CrewAI tasks helps, but isn't foolproof.
*   **Misinterpretation:** LLMs might misunderstand tool outputs or the nuances of the task context, leading to incorrect reasoning or decisions.
*   **Data Flow:** Incorrect context management in CrewAI task definitions can lead to agents not receiving the necessary information from previous tasks.
*   **Prompt Engineering:** Prompts (agent goals, backstories, task descriptions, expected outputs) will likely need iterative refinement to achieve desired LLM behavior and output quality.
*   **Tool Errors:** If the actual tool implementations (beyond stubs) have bugs or fail to handle edge cases, they will return error JSONs or raise exceptions, which the agents must be prompted to handle or which might halt task execution.
*   **Verbosity & Cost:** Detailed logging (`verbose=2`) is good for debugging but can be noisy and LLM interactions can be costly, so these need to be managed.
*   **Hallucination:** LLMs might "invent" data or justifications not strictly supported by the tool outputs or provided context. Clear instructions and grounding on tool outputs are key.
