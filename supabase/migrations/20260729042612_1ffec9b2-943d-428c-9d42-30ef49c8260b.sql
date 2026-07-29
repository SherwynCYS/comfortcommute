CREATE POLICY "Service role can manage alerts"
    ON public.alerts
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role can manage favorite routes"
    ON public.favorite_routes
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role can manage favorite stops"
    ON public.favorite_stops
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);