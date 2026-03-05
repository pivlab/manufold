# Manufold Backend

This folder implements a simple API for the frontend to invoke agents from the `manufold` package, located at [packages/manufold/](../packages/manufold).

While the API is intended to be run as part of the stack (see the [root README](../README.md) for details), you can run it independently on the host.

## Running the API server on the host

First, install the dependencies:

```bash
uv sync
```

This will install `manufold` as well as other dependencies for running the FastAPI server.

Then, run the API:

```bash
./start_api_server.sh
```

This will start the API server at http://localhost:8000. You can access the API documentation at `http://localhost:8000/docs`.

If you'd like to run the server on a different port, specify the `MANUGEN_API_PORT` environment var before running the script.
