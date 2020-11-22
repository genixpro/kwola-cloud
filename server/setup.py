import os

from setuptools import setup, find_packages

here = os.path.abspath(os.path.dirname(__file__))
with open('requirements-frozen.txt', 'rt') as f:
    requires = f.readlines()

tests_require = [
    'WebTest >= 1.3.1',  # py3 compat
    'pytest >= 3.7.4',
    'pytest-cov',
]

setup(
    name='kwolacloud',
    version='0.0',
    description='A cloud-based self-serve hosted version of Kwola.',
    long_description="",
    classifiers=[
        'Programming Language :: Python',
        'Framework :: Pyramid',
        'Topic :: Internet :: WWW/HTTP',
        'Topic :: Internet :: WWW/HTTP :: WSGI :: Application',
    ],
    author='',
    author_email='',
    url='',
    keywords='web pyramid pylons',
    packages=find_packages(),
    include_package_data=True,
    zip_safe=False,
    extras_require={
        'testing': tests_require,
    },
    package_data={
        'kwola': [
            'config/prebuilt_configs/*.json'
        ],
        'kwolacloud': [
            "config/core/*.json",
            "config/environments/*.json"
        ]
    },
    install_requires=requires,
    entry_points={
        'paste.app_factory': [
            'main = kwolacloud:main',
        ],
        'console_scripts': [
            'kwola = kwola.bin.main:main',
            'kwola_init = kwola.bin.initialize:main',
            'kwola_train_agent = kwola.bin.train_agent:main',
            'kwola_run_train_step = kwola.bin.run_train_step:main',
            'kwola_run_test_step = kwola.bin.run_test_step:main',
            'kwola_rapid_local_test_suite = kwola.bin.rapid_local_test_suite:main',
            'kwola_full_internal_test_suite = kwola.bin.full_internal_test_suite:main',
            'kwola_test_chromedriver = kwola.bin.test_chromedriver:main',
            'kwola_test_javascript_rewriting = kwola.bin.test_javascript_rewriting:main',
            'kwola_test_ffmpeg = kwola.bin.test_ffmpeg:main',
            'kwola_test_neural_network = kwola.bin.test_neural_network:main',
            'kwola_test_installation = kwola.bin.test_installation:main',
            'kwola_install_proxy_cert = kwola.bin.install_proxy_cert:main',
            'kwola_website_check = kwola.bin.website_check:main',
            'kwolacloud_run_hourly_tasks = kwolacloud.bin.run_hourly_tasks:main',
            'kwolacloud_migrate_trace_data = kwolacloud.bin.migrate_trace_data:main',
            'kwolacloud_migrate_bug_objects = kwolacloud.bin.migrate_bug_objects:main',
            'kwolacloud_migrate_user_subscriptions = kwolacloud.bin.migrate_user_subscriptions:main',
            'kwolacloud_run_migrations = kwolacloud.bin.run_migrations:main',
            'kwolacloud_load_demo_db = kwolacloud.bin.load_demo_db:main'
        ]
    },
)

