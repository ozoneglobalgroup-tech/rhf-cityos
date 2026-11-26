ARG DV32K_PYTHON_BASE=rhf-dv32k-python-base:3.12
FROM ${DV32K_PYTHON_BASE}
WORKDIR /srv
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 PYTHONNOUSERSITE=1
RUN pip install --no-cache-dir --disable-pip-version-check 'langgraph==1.2.24'
COPY engine.py server.py ./
USER 65532:65532
EXPOSE 3225
CMD ["python","-B","server.py"]
