import os

from setuptools import setup, find_packages

here = os.path.abspath(os.path.dirname(__file__))
with open('requirements.txt', 'rt') as f:
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
        'kwolacloud': [

        ]
    },
    install_requires=requires,
    entry_points={
        'paste.app_factory': [
            'main = kwolacloud:main',
        ],
        'console_scripts': [

        ]
    },
)

