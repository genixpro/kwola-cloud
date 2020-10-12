

function safeImport(importFunc)
{
    return () =>
    {
        try
        {
            return importFunc();
        }
        catch(err)
        {
            window.localStorage.setItem("returnTo", window.location.path);

            // If there is an error lazy loading a specific page, that may mean that the underlying frontend code was updated. So
            // just force a full reload of the page.
            window.location.reload(true);
        }
    };
}

export default safeImport;
